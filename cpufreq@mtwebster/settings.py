from gi.repository import Gtk
from gi.repository import Gdk
from os.path import expanduser
from time import sleep as wait
import os
import inspect

class Namespace: pass

parsed_settings = []
init=True
s = Namespace()


iface = Namespace()

def hexToR(h): return float(int(cutHex(h)[0:2], 16))/255

def hexToG(h): return float(int(cutHex(h)[2:4], 16))/255
def hexToB(h): return float(int(cutHex(h)[4:6], 16))/255
def cutHex(h): return h[1:7]


def hexToRGBA(js_hex):
    x = Gdk.RGBA(hexToR(js_hex), hexToG(js_hex), hexToB(js_hex), 1.0)
    return x
    
def rgbaToHexString(color):
    r = hex(int(round(color.red*255)))[2:4]
    g = hex(int(round(color.green*255)))[2:4]
    b = hex(int(round(color.blue*255)))[2:4]
    res = "#"+ r.zfill(2)+g.zfill(2)+b.zfill(2)
    return res

def defaultSettings():
    global s
    s.disp_style = 2
    s.digit_type = 0
    s.cpus = 0
    s.refresh = 2000
    s.width = 4
    s.bg_color = "#ffffff"
    s.low_color = "#00ff00"
    s.medium_color = "#ffff00"
    s.high_color = "#ff0000"
    s.text_color = "#ffffff"

def readSettings(settings_file_path):
    global parsed_settings
    file = open(settings_file_path)
    file_data = file.read()
    lines = file_data.split('\n')
    
    for i in range(0, len(lines)):
        line = lines[i]
        if line[0:1] == '#':
            parsed_settings.append(['_comment_', line])
            continue
        if line.strip() == '':
            parsed_settings.append(['_blank_', '_blank_'])
            continue
        component_line_pretrim = line.split(',')
        component_line = []
        for j in range(0, len(component_line_pretrim)):
            component_line.append(component_line_pretrim[j].strip())
        parsed_settings.append(component_line)

def writeSettings(file):
    global parsed_settings
    global iface
    os.remove(file)
    file = open(file, "w")
    for i in range(0, len(parsed_settings)):
        if parsed_settings[i][0] == "_blank_":
            file.write("\n")
        elif parsed_settings[i][0] == "_comment_":
            file.write(parsed_settings[i][1])
            file.write('\n')
        else:
            file.write(parsed_settings[i][0] + ", " + parsed_settings[i][1])
            file.write('\n')
    file.close()
    iface.apply_button.set_sensitive(False)

def getSetting(key, default):
    global parsed_settings
    if len(parsed_settings) == 0:
        return default
    res = ""
    for i in range(0, len(parsed_settings)):
        if key == parsed_settings[i][0]:
            res = parsed_settings[i][1]
    if res == "":
            return default
    else:
            return res
        
def putSetting(key, val):
    index = 0
    global parsed_settings
    for i in range(0, len(parsed_settings)):
        item = parsed_settings[i][0]
        if item == key:
            index = i
            continue
    parsed_settings[index][1] = val

def initSettings():
    global s
    s.disp_style = int(getSetting("Display Style", "2"))
    s.digit_type = int(getSetting("Digit Type", "0"))
    s.cpus = int(getSetting("CPUs to Monitor", "2"))
    s.refresh = int(getSetting("Refresh Time", "2000"))
    s.width = int(getSetting("Graph Width", "4"))
    s.bg_color = getSetting("Background", "#ffffff")
    s.low_color = getSetting("Low Color", "#00ff00")
    s.medium_color = getSetting("Med Color", "#ffff00")
    s.high_color = getSetting("High Color", "#ff0000")
    s.text_color = getSetting("Text Color", "#ffffff")
    
def saveSettings():
    global parsed_settings
    global s
    global settings_file_path
    putSetting("Display Style", str(s.disp_style))
    putSetting("Digit Type", str(s.digit_type))
    putSetting("CPUs to Monitor", str(s.cpus))
    putSetting("Refresh Time", str(int(s.refresh)))
    putSetting("Graph Width", str(int(s.width)))
    putSetting("Background", s.bg_color)
    putSetting("Low Color", s.low_color)
    putSetting("Med Color", s.medium_color)
    putSetting("High Color", s.high_color)
    putSetting("Text Color", s.text_color)
    writeSettings(settings_file_path)

def initIface():
    global s
    global iface
    iface.cpu_display_combo.set_active(s.cpus)
    iface.cpu_display_combo.queue_draw()
    iface.disp_style_combo.set_active(s.disp_style)
    iface.disp_style_combo.queue_draw()
    iface.show_combo.set_active(s.digit_type)
    iface.show_combo.queue_draw()
    iface.graph_width_slider.set_value(s.width)
    iface.graph_width_slider.queue_draw()
    iface.refresh_slider.set_value(s.refresh)
    iface.refresh_slider.queue_draw()
    iface.high_color.set_rgba(hexToRGBA(s.high_color))
    iface.high_color.queue_draw()
    iface.med_color.set_rgba(hexToRGBA(s.medium_color))
    iface.med_color.queue_draw()
    iface.low_color.set_rgba(hexToRGBA(s.low_color))
    iface.low_color.queue_draw()
    iface.text_color.set_rgba(hexToRGBA(s.text_color))
    iface.text_color.queue_draw()
    iface.bg_color.set_rgba(hexToRGBA(s.bg_color))
    iface.bg_color.queue_draw()

class Handler:
    def onDeleteWindow(self, *args):
        Gtk.main_quit(*args)

    def onDefaults(self, button):
        global window
        global iface
        defaultSettings()
        saveSettings()
        Gtk.main_quit(None)

    def onSettingChanged(self, *args):
        if init: return
        global s
        global iface
        s.disp_style = iface.disp_style_combo.get_active()
        s.digit_type = iface.show_combo.get_active()
        s.cpus = iface.cpu_display_combo.get_active()
        s.refresh = iface.refresh_slider.get_value()
        s.width = iface.graph_width_slider.get_value()
        s.bg_color = rgbaToHexString(iface.bg_color.get_rgba())
        s.text_color = rgbaToHexString(iface.text_color.get_rgba())
        s.high_color = rgbaToHexString(iface.high_color.get_rgba())
        s.medium_color = rgbaToHexString(iface.med_color.get_rgba())
        s.low_color = rgbaToHexString(iface.low_color.get_rgba())
        iface.apply_button.set_sensitive(True)
        
    def onSaveChanges(self, button):
        saveSettings()

builder = Gtk.Builder()
userhome = expanduser("~")
settings_file_path = userhome + "/.cinnamon/cpufreq@mtwebster/cpufreq.conf"
readSettings(settings_file_path)

applet_dir = os.path.dirname(inspect.getfile(inspect.currentframe()))
builder.add_from_file(applet_dir + "/settings.glade")

window = builder.get_object("dialog1")
defaultSettings()
initSettings()
builder.connect_signals(Handler())

# set the initial state of my settings in the dialog

iface.cpu_display_combo = builder.get_object("cpu_display_combo")
iface.disp_style_combo = builder.get_object("disp_style_combo")
iface.show_combo = builder.get_object("show_combo")
iface.graph_width_slider = builder.get_object("graph_width_slider")
iface.refresh_slider = builder.get_object("refresh_slider")
iface.high_color = builder.get_object("high_color")
iface.med_color = builder.get_object("med_color")
iface.low_color = builder.get_object("low_color")
iface.text_color = builder.get_object("text_color")
iface.bg_color = builder.get_object("bg_color")
iface.apply_button = builder.get_object("apply_button")

initIface()
init = False
window.show_all()

Gtk.main()
