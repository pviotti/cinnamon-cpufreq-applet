# Cinnamon CPU Frequency Selector Applet

This is a port of the [cpufreq-applet](https://github.com/yuyichao/gnome-shell-cpufreq) for Gnome Shell to Cinnamon.  
It is a fork of this [original port](https://github.com/mtwebster/gnome-shell-cpufreq) which has been modified to work on my laptop - which has a Intel Core i5.

## Changelog

In recent versions of the Linux kernel (> 3.9) the generic `acpi-cpufreq` driver has been replaced by `intel_pstate` which [appears to be more efficient](http://unix.stackexchange.com/a/121796) in handling Intel CPUs.  

These are the changes I did wrt the original port:

 * disabling explicit frequency selection, since the new driver does not create the file 
   `/sys/devices/system/cpu/cpu0/cpufreq/scaling_available_frequencies`
 * adjusted the frequency range for setting the graph bar colors (according to my CPUs min and max frequencies)

## TODO

 * Clean up quick hacks and enable explicit frequency selection for those CPUs which support it

