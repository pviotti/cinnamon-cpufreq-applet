from gi.repository import Gtk
from os.path import expanduser


parsed_settings = []

# set defaults and initialize setting holders
disp_style = 2
digit_type = 0
cpus = 0
refresh = 2000
width = 4
bg_color = "#ffffff"
low_color = "#00ff00"
medium_color = "#ffff00"
high_color = "#ff0000"
text_color = "#ffffff"


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
    disp_style = int(getSetting("Display Style", "2"))
    digit_type = int(getSetting("Digit Type", "0"))
    cpus = int(getSetting("CPUs to Monitor", "0"))
    refresh = int(getSetting("Refresh Time", "2000"))
    width = int(getSetting("Graph Width", "4"))
    bg_color = getSetting("Background", "#ffffff")
    low_color = getSetting("Low Color", "#00ff00")
    medium_color = getSetting("Med Color", "#ffff00")
    high_color = getSetting("High Color", "#ff0000")
    text_color = getSetting("Text Color", "#ffffff")

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





window.show_all()

Gtk.main()
