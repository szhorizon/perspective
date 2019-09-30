# *****************************************************************************
#
# Copyright (c) 2019, the Perspective Authors.
#
# This file is part of the Perspective library, distributed under the terms of
# the Apache License 2.0.  The full license can be found in the LICENSE file.
#
from random import random
from ipywidgets import Widget
from traitlets import Unicode
from .base import PerspectiveBaseMixin
from ..table import Table, PerspectiveManager


class PerspectiveWidget(PerspectiveBaseMixin, Widget):
    '''Perspective IPython Widget'''
    ############
    # Required #
    ############
    _model_name = Unicode('PerspectiveModel').tag(sync=True)
    _model_module = Unicode('@finos/perspective-jupyterlab').tag(sync=True)
    _model_module_version = Unicode('^0.3.0').tag(sync=True)
    _view_name = Unicode('PerspectiveView').tag(sync=True)
    _view_module = Unicode('@finos/perspective-jupyterlab').tag(sync=True)
    _view_module_version = Unicode('^0.3.0').tag(sync=True)
    ############

    '''
    def delete(self): self.send({'type': 'delete'})

    def update(self, data): self.send({'type': 'update', 'data': type_detect(data).data})

    def __del__(self): self.send({'type': 'delete'})
    '''

    def __init__(self, *args, **kwargs):
        '''
        Examples:
            >>> widget = perspective.Widget(row_pivots=["a"], sort=[["a", "desc"]])
        '''
        self.manager = PerspectiveManager()
        self.table_name = None
        super(PerspectiveWidget, self).__init__(*args, **kwargs)

    def load(self, table_or_data_or_schema, **config):
        ''' Load a `Table` or any of the data types/schemas supported by Perspective into the widget.

        Examples:
            >>> widget.load(tbl)
            >>> widget.load(data, {"index": "a"})
        '''
        if not isinstance(table_or_data_or_schema, Table):
            '''Create a new Table from user-provided data.'''
            table = Table(table_or_data_or_schema, config.get("options", {}))
        else:
            table = table_or_data_or_schema
        self.table_name = str(random())
        self.manager.host_table(self.table_name, table)
        print(self.table_name, self.manager, self.manager._tables)

    # TODO: what is the 'onmessage' handler for traitlets?
