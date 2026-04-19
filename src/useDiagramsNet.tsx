import * as React from 'react';
import * as ReactDOM from 'react-dom';
const { useEffect, useRef, useState } = React;
import {
    BLANK_DIAGRAM_SVG,
    DIAGRAMS_NET_URL,
    DIAGRAM_FRAME_BG,
    DIAGRAM_FRAME_ID,
} from './constants';
import type { DiagramExportMessage, SaveAndExitPayload } from './types';

/**
 * Hook wrapping the diagrams.net embedded editor.
 *
 * Based on: https://github.com/jgraph/drawio-integration
 * Message protocol: https://desk.draw.io/support/solutions/articles/16000042544
 *
 * On save, the host receives both a PNG and SVG export. The SVG carries the
 * XML source in `msg.xml` — that is what gets persisted as the `.svg.xml`.
 */
function useDiagramsNet(
    onSaveCallback: (payload: SaveAndExitPayload) => void,
    onStopEditing: () => void,
    getName: (() => string) | null,
    getData: (() => string | null) | null,
) {
    const [pngSave, setPngSave] = useState<DiagramExportMessage | null>(null);
    const [svgSave, setSvgSave] = useState<DiagramExportMessage | null>(null);

    const frameRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
        if (pngSave && svgSave) {
            onSaveCallback({ pngMsg: pngSave, svgMsg: svgSave });
            stopEditing();
            setPngSave(null);
            setSvgSave(null);
        }
        // onSaveCallback / stopEditing are stable enough for this plugin's use;
        // we only want this to fire once both halves of the export have arrived.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pngSave, svgSave]);

    /* ============== Transaction handlers ================== */

    function handleMessageEvent(evt: MessageEvent) {
        if (
            frameRef.current === null
            || evt.source !== frameRef.current.contentWindow
            || typeof evt.data !== 'string'
            || evt.data.length === 0
        ) {
            return;
        }
        try {
            const msg = JSON.parse(evt.data);
            if (msg !== null) {
                handleMessage(msg);
            }
        } catch (e) {
            console.error(e);
        }
    }

    function handleMessage(msg: any) {
        if (msg.event === 'init') {
            initializeEditor();
        } else if (msg.event === 'autosave') {
            // skip any autosave.
        } else if (msg.event === 'save') {
            postMessage({
                action: 'export',
                format: 'svg',
                embedImages: true,
                exit: false,
            });
            postMessage({
                action: 'export',
                format: 'png',
                embedImages: true,
                exit: msg.exit,
            });
        } else if (msg.event === 'export') {
            if (msg.format === 'png') {
                setPngSave(msg);
            } else if (msg.format === 'svg') {
                setSvgSave(msg);
            }
        }
        if (msg.event === 'exit') {
            stopEditing();
        }
    }

    function postMessage(msg: unknown) {
        frameRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
    }

    /* ============== Application callbacks ================== */

    function initializeEditor() {
        const title = getName ? getName() : 'Untitled';
        const diagram = getData ? getData() ?? BLANK_DIAGRAM_SVG : BLANK_DIAGRAM_SVG;

        postMessage({
            action: 'load',
            noSaveBtn: 1,
            autosave: 0,
            saveAndExit: '1',
            modified: 'unsavedChanges',
            xml: diagram,
            title: title,
        });
    }

    /* ============== Hook interface ===================== */

    function startEditing() {
        window.addEventListener('message', handleMessageEvent);
        const frame = (
            <iframe
                src={DIAGRAMS_NET_URL}
                id={DIAGRAM_FRAME_ID}
                title={DIAGRAM_FRAME_ID}
                ref={frameRef}
                style={{
                    position: 'fixed',
                    width: '100%',
                    height: '100%',
                    left: '0',
                    top: '0',
                    border: 'none',
                    zIndex: 10,
                    backgroundColor: DIAGRAM_FRAME_BG,
                }}
            />
        );
        const mountPoint = document.getElementById(DIAGRAM_FRAME_ID);
        if (mountPoint) {
            ReactDOM.render(frame, mountPoint);
        }
    }

    function stopEditing() {
        onStopEditing();
        try {
            const mountPoint = document.getElementById(DIAGRAM_FRAME_ID);
            if (mountPoint) {
                ReactDOM.render(<div id={DIAGRAM_FRAME_ID} />, mountPoint);
            }
            window.removeEventListener('message', handleMessageEvent);
        } catch {
            // DOM node gone
        }
    }

    return {
        startEditing,
        stopEditing,
    };
}

export default useDiagramsNet;
