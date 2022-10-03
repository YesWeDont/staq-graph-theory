yearseven = "<sensitive>"
yeareight = "<sensitive>"
yearnine = "<sensitive>"
final = [yearseven, yeareight, yearnine]
import re
for x in final:
    for i in re.findall('\((.*?)\)', x):
        print(i, end=' ')
