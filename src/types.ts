import type { Vault } from 'obsidian';

/**
 * Describes a diagram and its host document. A diagram is stored as a pair:
 *   - <name>.svg      — rendered image, embedded in the markdown note
 *   - <name>.svg.xml  — editable diagrams.net source
 *
 * `path`/`basename` refer to the host markdown note (used when inserting a
 * reference after creating a new diagram).
 */
export interface FileInfo {
    path: string | undefined;
    basename: string | undefined;
    svgPath: string;
    xmlPath: string;
    diagramExists: boolean;
}

/** Payload passed from the diagrams.net iframe on a successful export. */
export interface DiagramExportMessage {
    data: string;
    xml: string;
    format: 'png' | 'svg';
}

/** Combined save payload: both SVG and PNG exports from the editor. */
export interface SaveAndExitPayload {
    pngMsg: DiagramExportMessage;
    svgMsg: DiagramExportMessage;
}

/** Props accepted by `DiagramsApp`. */
export interface DiagramsAppProps {
    xmlPath: string;
    diagramExists: boolean;
    vault: Vault;
    handleExit: () => void | Promise<void>;
    handleSaveAndExit: (msg: SaveAndExitPayload) => void | Promise<void>;
}
