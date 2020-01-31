/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import "@finos/perspective-viewer";
import {Widget} from "@phosphor/widgets";

let ID_COUNTER = 0;

export class PerspectiveViewerWidget extends Widget {
    constructor({title, table}) {
        const {viewer, node} = createNode();
        super({node});
        this.viewer = viewer;
        this.table = table;

        this.title.label = title;
        this._loaded = false;
        this.master = false;
    }

    set master(value) {
        if (value !== undefined && this._master !== value) {
            if (value) {
                this.viewer.classList.add("workspace-master-widget");
                this.viewer.classList.remove("workspace-detail-widget");
                this.viewer.selectable = true;
            } else {
                this.viewer.classList.add("workspace-detail-widget");
                this.viewer.classList.remove("workspace-master-widget");
                this.viewer.selectable = null;
            }
            this._master = value;
        }
    }

    get master() {
        return this._master;
    }

    set table(value) {
        if (value) {
            if (this._loaded) {
                this.viewer.replace(value);
            } else {
                this.viewer.load(value);
            }
            this._loaded = true;
        }
    }

    get table() {
        return this.viewer.table;
    }

    toggleConfig() {
        this.viewer.toggleConfig();
    }

    restore(config) {
        const {master, table, ...viewerConfig} = config;
        this.tableName = table;
        this.master = master;
        this.viewer.restore({...viewerConfig});
    }

    save() {
        return {
            ...this.viewer.save(),
            master: this.master,
            table: this.tableName
        };
    }

    removeClass(name) {
        super.removeClass(name);
        this.viewer && this.viewer.classList.remove(name);
    }

    async onCloseRequest(msg) {
        super.onCloseRequest(msg);
        await this.viewer.delete();
        this.viewer.parentElement.removeChild(this.viewer);
    }

    onResize(msg) {
        this.notifyResize();
        super.onResize(msg);
    }

    async notifyResize() {
        if (this.isVisible) {
            await this.viewer.notifyResize();
        }
    }
}

const createNode = () => {
    const div = document.createElement("div");
    const slot = document.createElement("slot");
    const name = `AUTO_ID_${ID_COUNTER++}`;
    slot.setAttribute("name", name);
    div.classList.add("viewer-container");
    div.appendChild(slot);

    const node = document.createElement("div");
    node.classList.add("workspace-widget");
    node.appendChild(div);

    const viewer = document.createElement("perspective-viewer");
    viewer.setAttribute("slot", name);

    return {node: node, viewer: viewer};
};
