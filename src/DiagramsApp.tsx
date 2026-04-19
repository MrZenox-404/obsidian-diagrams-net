import * as React from 'react';
import { TFile } from 'obsidian';
import useDiagramsNet from './useDiagramsNet';
import { DIAGRAM_FRAME_ID } from './constants';
import type { DiagramsAppProps } from './types';

export const DiagramsApp = (props: DiagramsAppProps) => {
    const {
        xmlPath,
        diagramExists,
        vault,
        handleExit,
        handleSaveAndExit,
    } = props;

    const [xmlData, setXmlData] = React.useState<string | null>(null);

    const { startEditing } = useDiagramsNet(
        handleSaveAndExit,
        handleExit,
        () => '',
        () => xmlData,
    );

    const loadXmlData = async () => {
        const xmlFile = vault.getAbstractFileByPath(xmlPath);
        if (!(xmlFile instanceof TFile)) {
            return;
        }
        const data = await vault.cachedRead(xmlFile);
        setXmlData(data);
    };

    React.useEffect(() => {
        if (diagramExists) {
            if (!xmlData) {
                loadXmlData();
            } else {
                startEditing();
            }
        } else {
            startEditing();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [xmlData]);

    return <div id={DIAGRAM_FRAME_ID} />;
};
