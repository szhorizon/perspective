/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import {Message} from '@phosphor/messaging';
import {DOMWidgetModel, DOMWidgetView, ISerializers} from '@jupyter-widgets/base';

import {PERSPECTIVE_VERSION} from './version';

import perspective from "@finos/perspective";
import Client from "@finos/perspective/dist/esm/api/client.js";

import * as wasm from "@finos/perspective/dist/umd/psp.async.wasm";
import * as worker from "!!file-worker-loader?inline=true!@finos/perspective/dist/umd/perspective.wasm.worker.js";

if (perspective) {
    perspective.override({wasm, worker});
} else {
    console.warn('Perspective was undefined - wasm load errors may occur');
}

import {PerspectiveWidget, PerspectiveWidgetOptions} from '@finos/perspective-phosphor';

export
class JupyterPerspectiveClient extends Client {
    model : any

    send(msg : any) {
        this.model.set("message_to_manager", msg);
    }
}

// TODO: rewrite
export
class PerspectiveModel extends DOMWidgetModel {
    defaults() {
        return {
            ...super.defaults(),
            _model_name: PerspectiveModel.model_name,
            _model_module: PerspectiveModel.model_module,
            _model_module_version: PerspectiveModel.model_module_version,
            _view_name: PerspectiveModel.view_name,
            _view_module: PerspectiveModel.view_module,
            _view_module_version: PerspectiveModel.view_module_version,
            _data: [],
            _bin_data: [],

            datasrc: '',
            schema: {},
            plugin: 'hypergrid',
            columns: [],
            rowpivots: [],
            columnpivots: [],
            aggregates: [],
            sort: [],
            index: '',
            limit: -1,
            computedcolumns: [],
            filters: [],
            plugin_config: {},
            settings: false,
            embed: false,
            dark: false
        };
    }

    static serializers: ISerializers = {
        ...DOMWidgetModel.serializers,
        // Add any extra serializers here
    }

    static model_name = 'PerspectiveModel';
    static model_module = '@finos/perspective-jupyterlab';
    static model_module_version = PERSPECTIVE_VERSION;
    static view_name = 'PerspectiveView';
    static view_module = '@finos/perspective-jupyterlab';
    static view_module_version = PERSPECTIVE_VERSION;
}


export type JupyterPerspectiveWidgetOptions = {
    view?: any;
}


export
class JupyterPerspectiveWidget extends PerspectiveWidget {
    constructor(name: string = 'Perspective', options: JupyterPerspectiveWidgetOptions & PerspectiveWidgetOptions) {
        console.log("CONSTRUCTING");
        let view = options.view;
        delete options.view;
        super(name, options as PerspectiveWidgetOptions);
        this._view = view;
        console.log(this._view);
    }

    /**
     * Process the phosphor message.
     *
     * Any custom phosphor widget used inside a Jupyter widget should override
     * the processMessage function like this.
     */
    processMessage(msg: Message) {
        console.log("PROCESSMESSAGE", msg);
        super.processMessage(msg);
        this._view.processPhosphorMessage(msg);
    }

    /**
     * Dispose the widget.
     *
     * This causes the view to be destroyed as well with 'remove'
     */
    dispose() {
        if (this.isDisposed) {
            return;
        }
        super.dispose();
        if (this._view) {
            this._view.remove();
        }
        this._view = null;
    }

    private _view: DOMWidgetView;
}



export
class PerspectiveView extends DOMWidgetView {
    pWidget: PerspectiveWidget;
    client: JupyterPerspectiveClient;

    render() {
        super.render();
        this.client = new JupyterPerspectiveClient();
        this.client.model = this.model;
        this.client.send({
            id: -1,
            cmd: "init"
        });
        console.log(this.client, this.model);

        this.pWidget = new JupyterPerspectiveWidget(undefined, {});
        this.model.on("change:table_name", this.table_name_changed, this);
        return this.pWidget.node;
    }

    table_name_changed() {
        const new_table_name = this.model.get("table_name");
        const table = this.client.open_table(new_table_name);
        this.pWidget._load_table(table);
    }

    remove() {
        this.pWidget.delete();
    }

    _update(msg: any) {
        if (msg.type === 'update') {
            this.pWidget._update(msg.data);
        } else if (msg.type === 'delete') {
            this.pWidget.delete();
        }
    }
}