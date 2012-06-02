from gi.repository import Gtk
from os.path import expanduser


parsed_settings = []

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
