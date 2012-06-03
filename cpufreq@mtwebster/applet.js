/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// cpufreq-applet: Gnome shell extension displaying icons in overview mode
// Copyright (C) 2011 Yichao Yu

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Author: Yichao Yu
// Email: yyc1992@gmail.com

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Panel = imports.ui.panel;

const Util = imports.misc.util;
const FileUtils = imports.misc.fileUtils;

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;
const Cinnamon = imports.gi.Cinnamon;
const Applet = imports.ui.applet;
const UUID = 'cpufreq@mtwebster';
const AppletDir = imports.ui.appletManager.applets[UUID];
const AppletSettings = AppletDir.appletSettings;

const ColorSlider = AppletDir.colorSlider;

let start = GLib.get_monotonic_time();
let settings = {};
let cpus = [];
let selectors = [];
let box;
let summary;
let atomic = false;
const DEFAULT_STYLE = "2";
const DEFAULT_DIGIT_TYPE = "0";
const DEFAULT_CPUS = "0";
// global settings variables;

let settings;

let summary_only = false;
let refresh_time = 2000;
let background = '#FFFFFF80';
let style = DEFAULT_STYLE;
let graph_width = '6';
let digit_type = DEFAULT_DIGIT_TYPE;
let cpus_to_monitor = DEFAULT_CPUS;
let text_color = '#FFFF80';
let low_color = '#00FF00'; // green
let mid_color = '#FFFF00'; // yellow
let hi_color = '#FF0000'; // red

const cpu_path = '/sys/devices/system/cpu/';
const cpu_dir = Gio.file_new_for_path(cpu_path);
const height = Math.round(Panel.PANEL_ICON_SIZE * 4 / 5);
const DEC_WHITE = 16777215;
var Background = new Clutter.Color();

//basic functions

function d2h(d) {return '#' + d.toString(16);}
function h2d(h) {return parseInt(h.replace('#',''),16);}

function parseInts(strs) {
    let rec = [];
    for (let i in strs)
        rec.push(parseInt(strs[i]));
    return rec;
}
function rd_frm_file(file) {
    return Cinnamon.get_file_contents_utf8_sync(file).replace(/\n/g, '').replace(/ +/g, ' ').replace(/ +$/g, '').split(' ');
}
function rd_nums_frm_file(file) {
    return parseInts(rd_frm_file(file));
}
function num_to_freq_panel(num) {
    num = Math.round(num);
    if (num < 1000)
        return num + ' kHz';
    if (num < 1000000)
        return Math.round(num / 10) / 100 + ' MHz';
    if (num < 1000000000)
        return Math.round(num / 10000) / 100 + ' GHz';
    return Math.round(num / 10000000) / 100 + ' THz';
}
function num_to_freq(num) {
    num = Math.round(num);
    if (num < 1000)
        return num + ' kHz';
    if (num < 1000000)
        return Math.round(num) / 1000 + ' MHz';
    if (num < 1000000000)
        return Math.round(num / 1000) / 1000 + ' GHz';
    return Math.round(num / 1000000) / 1000 + ' THz';
}
function percent_to_hex(str, num) {
    return str.format(Math.min(Math.floor(num * 256), 255)).replace(' ', '0');
}
function num_to_color(num, min, max) {
    if (num >= max-1000) // max-101 is because on at least my machine there is a max of 2.401, next step is 2.4
        return hi_color; // I'm guessing the 2.401 is for turbo boost? (i7)  so this is to ensure 'hi' level
    if (num == min)     // at the 'normal' hi (i.e. 2.4)
        return low_color;
    return mid_color;
}

function Panel_Indicator() {
    this._init.apply(this, arguments);
}
Panel_Indicator.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function(name, parent) {
        PanelMenu.Button.prototype._init.call(this, 0.0);
        this.name = name
        this._parent = parent;

        let a = this.initSettings();
        this.buildit();
    },

    initSettings: function() {
        background = settings.getString('Background','#FFFF80');
        cpus_to_monitor = parseInt(settings.getString('CPUs to Monitor', DEFAULT_CPUS));
        refresh_time = parseInt(settings.getString('Refresh Time', '2000'));
        style = parseInt(settings.getString('Display Style', DEFAULT_STYLE));
        graph_width = parseInt(settings.getString('Graph Width', '6'));
        digit_type = parseInt(settings.getString('Digit Type', DEFAULT_DIGIT_TYPE));
        text_color = settings.getString('Text Color', '#FFFF80');
        low_color = settings.getString('Low Color', '#00FF00');
        mid_color = settings.getString('Med Color', '#FFFF00');
        hi_color = settings.getString('High Color', '#FF0000');
    },

    buildit: function() {

        Background.from_string(background);
        this.actor.has_tooltip = true;
        this.actor.tooltip_text = this.name;
        this.actor.remove_style_class_name('panel-button');
        this.actor.add_style_class_name('cfs-panel-button');
        this.color = new Clutter.Color();
        this.label = new St.Label({ text: this.name, style_class: 'cfs-label' });

        this.digit = new St.Label({ style_class: 'cfs-panel-value' });
        this.digit.style = "font-size: 12px; padding: 0 2px 0 2px; color:" + text_color + ";";
        this.graph = new St.DrawingArea({reactive: false});
        this.graph.height = height;
        this.box = new St.BoxLayout();
        this.graph.connect('repaint', Lang.bind(this, this._draw));
        this.box.connect('show', Lang.bind(this.graph, function() {
            this.queue_repaint();
        }));

        this.label.visible = false; // override for now - show-text


        this.graph.visible = style == 0 || style == 2;
        this.digit.visible = style == 1 || style == 2;
        
        
        this.graph.width = graph_width;

        this.box.add_actor(this.label);
        this.box.add_actor(this.graph);
        this.box.add_actor(this.digit);
        this.actor.add_actor(this.box);
        this.add_menu_items();

        this.set_digit = digit_type == 0 ? function () {
            this.digit.text = ' ' + num_to_freq_panel(this._parent.avg_freq);
        } : function () {
            this.digit.text = ' ' + Math.round(this._parent.avg_freq / this._parent.max * 100) + '%';
        };

        this._onChange();
        this._parent.connect('cur-changed', Lang.bind(this, this._onChange));

    },

    _draw: function() {
        if ((this.graph.visible || this.box.visible) == false) return;
        let [width, heigth] = this.graph.get_surface_size();
        let cr = this.graph.get_context();
        let value = this._parent.avg_freq / this._parent.max;
        this.color.from_string(num_to_color(this._parent.avg_freq, this._parent.min, this._parent.max));
        Clutter.cairo_set_source_color(cr, Background);
        cr.rectangle(0, 0, width, height);
        cr.fill();
        Clutter.cairo_set_source_color(cr, this.color);
        cr.rectangle(0, height * (1 - value), width, height);
        cr.fill();
    },

    _onChange: function() {
        for (let i in this.menu_items) {
            let type = this.menu_items[i].type;
            let id = this.menu_items[i].id;
            this.menu_items[i].setShowDot(this._parent['cur_' + type].indexOf(this._parent['avail_' + type + 's'][id]) >= 0);
        }
        this.set_digit();
        this.graph.queue_repaint();
    },

    add_menu_items: function() {
        this.menu_items = [];
        for (let i in this._parent.avail_freqs) {
            let menu_item = new PopupMenu.PopupBaseMenuItem(null, {reactive: true});
            let val_label = new St.Label({ text: num_to_freq(this._parent.avail_freqs[i]) });
            menu_item.id = i;
            menu_item.type = 'freq';
            menu_item.addActor(val_label);
            this.menu.addMenuItem(menu_item);
            this.menu_items.push(menu_item);
        }
        this._parent.avail_freqs.length && this._parent.avail_governors.length &&
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        for (let i in this._parent.avail_governors) {
            let menu_item = new PopupMenu.PopupBaseMenuItem(null, {reactive: true});
            let val_label = new St.Label({ text: this._parent.avail_governors[i] });
            menu_item.id = i;
            menu_item.type = 'governor'
            menu_item.addActor(val_label);
            this.menu.addMenuItem(menu_item);
            this.menu_items.push(menu_item);
        }
        for (let i in this.menu_items) {
            this.menu_items[i].connect('activate', Lang.bind(this, function(item) {
                this._parent.set(item.type ,item.id);
            }));
        }
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        let config_menu_item = new PopupMenu.PopupBaseMenuItem(null, {reactive: true});
        let config_icon = new St.Icon({icon_name: "system-run", icon_size: 16, icon_type: St.IconType.SYMBOLIC});
        config_menu_item.addActor(config_icon);
        config_menu_item.connect('activate', Lang.bind(this, this._launch_settings));
        this.menu.addMenuItem(config_menu_item);

    },

    _launch_settings: function () {
        try {
            command = "python " + settings.applet_dir.get_child('settings.py').get_path();
            Main.Util.spawnCommandLine(command);
        } catch (e) { global.logError(e); }
    }
};

function CpufreqSelectorBase() {
    this._init.apply(this, arguments);
}
CpufreqSelectorBase.prototype = {
    arg: { governor: '-g', freq: '-f'},
    _init: function(cpu) {
        this.cpunum = cpu.replace(/cpu/, '');
        this.cpufreq_path = cpu_path + '/' + cpu + '/cpufreq/';
        this.get_avail();
        this.get_cur();
        this.indicator = new Panel_Indicator(cpu, this);
        if ('timeout' in this)
            Mainloop.source_remove(this.timeout);
        this.timeout = Mainloop.timeout_add(refresh_time, Lang.bind(this, this.update));
    },

    get_avail: function() {
        this.max = rd_nums_frm_file(this.cpufreq_path + '/scaling_max_freq')[0];
        this.min = rd_nums_frm_file(this.cpufreq_path + '/scaling_min_freq')[0];
        this.avail_freqs = rd_nums_frm_file(this.cpufreq_path + '/scaling_available_frequencies');
        this.avail_governors = rd_frm_file(this.cpufreq_path + '/scaling_available_governors');
    },

    get_cur: function() {
        this.cur_freq = rd_nums_frm_file(this.cpufreq_path + '/scaling_cur_freq');
        this.avg_freq = this.cur_freq[0];
        this.cur_governor = rd_frm_file(this.cpufreq_path + '/scaling_governor');
    },

    set: function(type, index) {
        Util.spawn(['cpufreq-selector', '-c', this.cpunum.toString(), this.arg[type], this['avail_' + type + 's'][index].toString()]);
    },

    update: function() {
        let old_freq = this.cur_freq;
        let old_governor = this.cur_governor;
        this.get_cur();
        if (old_freq != this.cur_freq || old_governor != this.cur_governor)
            this.emit('cur-changed');
        return true;
    }
};
Signals.addSignalMethods(CpufreqSelectorBase.prototype);

function CpufreqSelector() {
    this._init.apply(this, arguments);
}
CpufreqSelector.prototype = {
    __proto__: CpufreqSelectorBase.prototype,

    get_avail: function() {
        this.max = 0;
        this.min = 0;
        let freqs = {};
        let governors = {};
        for (let i in selectors) {
            let selector = selectors[i];
            this.max += selector.max;
            this.min += selector.min;
            for (let j in selector.avail_freqs)
                freqs[selector.avail_freqs[j]] = 1;
            for (let j in selector.avail_governors)
                governors[selector.avail_governors[j]] = 1;
        }
        this.max /= selectors.length;
        this.min /= selectors.length;
        this.avail_freqs = [];
        this.avail_governors = [];
        for (let freq in freqs)
            this.avail_freqs.push(freq);
        for (let governor in governors)
            this.avail_governors.push(governor);
    },

    get_cur: function() {
        this.avg_freq = 0;
        this.cur_freq = [];
        this.cur_governor = [];
        let freqs = {};
        let governors = {};
        for (let i in selectors) {
            let selector = selectors[i];
            this.avg_freq += selector.avg_freq;
            freqs[selector.avg_freq] = 1;
            for (let j in selector.cur_governor)
                governors[selector.cur_governor[j]] = 1;
        }
        this.avg_freq /= selectors.length;
        for (let freq in freqs)
            this.cur_freq.push(freq);
        for (let governor in governors)
            this.cur_governor.push(governor);
    },

    set: function(type, index) {
        for (let i in selectors)
            selectors[i].set(type, index);
    },
};


Signals.addSignalMethods(this);

function add_cpus_frm_files(cpu_child) {
    try {
    let pattern = /^cpu[0-9]+/
    for (let i in cpu_child)
        if (pattern.test(cpu_child[i].get_name()))
            cpus.push(cpu_child[i].get_name());
    for (let i in cpus) {
        selectors[i] = new CpufreqSelectorBase(cpus[i]);
        box.add_actor(selectors[i].indicator.actor);
        Main.panel._menus.addMenu(selectors[i].indicator.menu);
    }
    summary = new CpufreqSelector('cpu');
    box.add_actor(summary.indicator.actor);
    Main.panel._menus.addMenu(summary.indicator.menu);
    let visible = [];
    for (let i in selectors)
        visible[i] = true;
    visible[-1] = true;
    switch (cpus_to_monitor) {
        case 0:
            break;
        case 2:
            for (let i = 0; i < visible.length; i++) {
                visible[i] = false;
            }
            break;
        case 1:
            visible[-1] = false;
            break;
    }
    for (let i in selectors)
        selectors[i].indicator.actor.visible = visible[i];
    summary.indicator.actor.visible = visible[-1];
    } catch (e) {
        global.logError(e);
    }
    atomic=false;
}



function main(metadata, orientation) {
    let myApplet = new MyApplet(orientation);
    return myApplet;
}

function MyApplet(orientation) {
    this._init(orientation);
}

MyApplet.prototype = {
        __proto__: Applet.Applet.prototype,

        _init: function(orientation) {
            Applet.Applet.prototype._init.call(this, orientation);
            try {
                    this.orientation = orientation;
                    this._initialize_settings();
                    this.rebuild();
            } catch (e) {
                global.logError(e);
            }
        },

        _initialize_settings: function() {
            settings = new AppletSettings.AppletSettings(UUID, 'cpufreq.conf.dist', 'cpufreq.conf');
            settings.connect('settings-file-changed', Lang.bind(this, this.rebuild));
        },

        rebuild: function() {
            if (atomic)
                return;
            atomic = true; // hackity hack - make sure only one rebuild is happening at a time,
            try { //                         else we get lots more from setting changes
                this.actor.remove_actor(this.myactor);
                box.destroy();
                this.myactor.destroy();
                cpus = [];
                selectors = [];
            } catch (e) {
                // this will error on first load, ignore?
            }

            try {
                settings.readSettings();
                this.myactor = new St.BoxLayout({ pack_start: true });
                box = this.myactor;
                this.actor.add(this.myactor);

                this.actor.reactive = global.settings.get_boolean("panel-edit-mode");
                global.settings.connect('changed::panel-edit-mode', Lang.bind(this, this.on_panel_edit_mode_changed));

                FileUtils.listDirAsync(cpu_dir, Lang.bind(this, add_cpus_frm_files));
                let finish = GLib.get_monotonic_time();
                log('cpufreq: use ' + (finish - start));
            } catch (e) {
                global.logError(e);
            }
        },

        on_panel_edit_mode_changed: function() {
            this.actor.reactive = global.settings.get_boolean("panel-edit-mode");
        }
};
