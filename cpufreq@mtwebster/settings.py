from gi.repository import Gtk
from os.path import expanduser
from matplotlib.colors import colorConverter

class Namespace: pass

parsed_settings = []

# set defaults and initialize setting holders
s = Namespace()
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






def hexToR(h): return int((cutHex(h))[0,2],16)
def hexToG(h): return int((cutHex(h))[2,4],16)
def hexToB(h): return int((cutHex(h))[4,6],16)
def cutHex(h): return h[1,7]
def d2h(d):
    h = d.toString(16)
    return (h.length == 1) ? '0' + h : h


def int2hexcolor(d):
    b = d & 255
    g = (d >> 8) & 255
    r = (d >> 16) & 255
    rgbhex = d2h(r) + d2h(g) + d2h(b)
    return rgbhex


function hexcolor2int(h) {
    let r = hexToR(h);
    let g = hexToG(h);
    let b = hexToB(h);
    let intcolor = (r << 16);
    intcolor += (g << 8);
    intcolor += b;
    return intcolor;
}










def readSettings(settings_file_path):
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
        parsed_settings.append(component_line);
    print parsed_settings




def getSetting(key, default):
    if len(parsed_settings) == 0:
        return default;
    res = ""
    for i in range(0, len(parsed_settings)):
        if key == parsed_settings[i][0]:
            res = this.parsed_settings[i][1]
        if res == "":
            return default
        else:
            return result

def initSettings():
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

class Handler:
    def onDeleteWindow(self, *args):
        Gtk.main_quit(*args)

    def onButtonPressed(self, button):
        print "Hello World!"

builder = Gtk.Builder()
userhome = expanduser("~")
settings_file_path = userhome + "/.cinnamon/cpufreq@mtwebster/cpufreq.conf"
readSettings(settings_file_path)

builder.add_from_file("settings.glade")
builder.connect_signals(Handler())

window = builder.get_object("dialog1")
initSettings()

# set the initial state of my settings in the dialog
cpu_display_combo = builder.get_object("cpu_display_combo")
cpu_display_combo.set_active(s.cpus)

disp_style_combo = builder.get_object("disp_style_combo")
disp_style_combo.set_active(s.disp_style)

show_combo = builder.get_object("show_combo")
show_combo.set_active(s.digit_type)

graph_width_slider = builder.get_object("graph_width_slider")
graph_width_slider.set_value(s.width)

refresh_slider = builder.get_object("refresh_slider")
refresh_slider.set_value(s.refresh)

high_color = builder.get_object("high_color")
high_color.set_rgba(colorConverter.to_rgba(high_color,alpha=1.0))

window.show_all()




Gtk.main()
