import { ItemView, WorkspaceLeaf, Workspace, View, Vault, TFile, MarkdownView } from 'obsidian';
import { DIAGRAM_VIEW_TYPE } from './constants';
import { DiagramsApp } from './DiagramsApp';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import type { FileInfo, SaveAndExitPayload } from './types';

export default class DiagramsView extends ItemView {
    filePath: string | undefined;
    fileName: string | undefined;
    svgPath: string;
    xmlPath: string;
    diagramExists: boolean;
    hostView: View | null;
    vault: Vault;
    workspace: Workspace;
    displayText: string;

    getDisplayText(): string {
        return this.displayText ?? 'Diagram';
    }

    getViewType(): string {
        return DIAGRAM_VIEW_TYPE;
    }

    constructor(leaf: WorkspaceLeaf, hostView: View | null, initialFileInfo: FileInfo) {
        super(leaf);
        this.filePath = initialFileInfo.path;
        this.fileName = initialFileInfo.basename;
        this.svgPath = initialFileInfo.svgPath;
        this.xmlPath = initialFileInfo.xmlPath;
        this.diagramExists = initialFileInfo.diagramExists;
        this.vault = this.app.vault;
        this.workspace = this.app.workspace;
        this.hostView = hostView;
    }

    async onOpen() {
        const close = () => {
            this.workspace.detachLeavesOfType(DIAGRAM_VIEW_TYPE);
        };

        const handleExit = async () => {
            close();
        };

        const saveData = (msg: SaveAndExitPayload) => {
            const svgData = msg.svgMsg.data;
            const svgBuffer = Buffer.from(svgData.replace('data:image/svg+xml;base64,', ''), 'base64');
            if (this.diagramExists) {
                const svgFile = this.vault.getAbstractFileByPath(this.svgPath);
                const xmlFile = this.vault.getAbstractFileByPath(this.xmlPath);
                if (!(svgFile instanceof TFile && xmlFile instanceof TFile)) {
                    return;
                }
                this.vault.modifyBinary(svgFile, svgBuffer);
                this.vault.modify(xmlFile, msg.svgMsg.xml);
            } else {
                this.vault.createBinary(this.svgPath, svgBuffer);
                this.vault.create(this.xmlPath, msg.svgMsg.xml);
            }
        };

        const insertDiagram = () => {
            if (!(this.hostView instanceof MarkdownView)) {
                return;
            }
            const cursor = this.hostView.editor.getCursor();
            this.hostView.editor.replaceRange(`![[${this.svgPath}]]`, cursor);
        };

        const handleSaveAndExit = async (msg: SaveAndExitPayload) => {
            saveData(msg);
            if (!this.diagramExists) {
                insertDiagram();
            }
            close();
        };

        const container = this.containerEl.children[1];

        ReactDOM.render(
            <DiagramsApp
                xmlPath={this.xmlPath}
                diagramExists={this.diagramExists}
                vault={this.vault}
                handleExit={handleExit}
                handleSaveAndExit={handleSaveAndExit}
            />,
            container,
        );
    }

    async onClose() {
        ReactDOM.unmountComponentAtNode(this.containerEl.children[1]);
    }
}
