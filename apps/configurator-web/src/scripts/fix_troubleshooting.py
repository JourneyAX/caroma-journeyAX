import os

troubleshooting_dir = "/Users/mahaveer/Documents/Mahaveer/Projects/JourneyAX/Caroma-Poc/GWA/Troubleshooting files"

guides = {
    "dripping_tap.md": """# Troubleshooting: Dripping Tap or Mixer

## Symptoms
- Tap drips continuously when turned off.
- Water leaks from the handle or spout.
- Handle feels stiff or doesn't close smoothly.

## Likely Causes
1. **Worn Ceramic Cartridge:** Most modern Caroma mixers (like Liano II, Urbane II) use ceramic disc cartridges. If these get scratched by debris in the water or wear out over time, they leak.
2. **Worn O-rings/Seals:** The rubber seals around the base of the spout or inside the handle can degrade.
3. **High Water Pressure:** If the home's water pressure exceeds 500kPa, it can force water past the seals.

## Fix vs Replace
- **Fix:** Replacing a ceramic cartridge is a straightforward DIY job. You need an Allen key to remove the handle, a spanner to unscrew the cartridge nut, and the replacement cartridge (check your specific model for the correct 35mm or 40mm cartridge).
- **Replace:** If the tap body is heavily corroded, the finish is flaking, or it's an older jumper-valve model, upgrading to a new Caroma mixer might be more cost-effective long-term.

## DIY Steps to Replace a Cartridge
1. **Turn off the water supply** at the mains or isolation valves!
2. Remove the small indicator plug (red/blue dot) on the handle.
3. Use an Allen key to loosen the grub screw inside and pull the handle off.
4. Unscrew the decorative dome (usually by hand).
5. Use a spanner to undo the brass retaining nut.
6. Pull out the old cartridge and insert the new one, ensuring the locating pins line up.
7. Reassemble in reverse order and turn the water back on.
""",

    "shower_head_problem.md": """# Troubleshooting: Leaking or Blocked Shower Head

## Symptoms
- Showerhead drips after being turned off.
- Water sprays in all directions or has poor flow.
- Leaks from the connection point between the shower arm and the head.

## Likely Causes
1. **Residual Water (Normal):** It's normal for large overhead rain showers to drip for a few minutes after turning off as the residual water drains out.
2. **Worn Shower Mixer Cartridge:** If the shower drips continuously hours after use, the issue is actually the shower *mixer* on the wall, not the showerhead itself. The cartridge inside the mixer is failing to shut off the water.
3. **Blocked Nozzles:** Hard water scale (calcium/limescale) can block the silicone nozzles, causing uneven spray or reduced pressure.
4. **Failing Teflon Tape:** A leak at the joint where the showerhead screws onto the arm means the seal has failed.

## Fix vs Replace
- **Fix (Blockages):** Rub the silicone nozzles with your thumb while the water is running to dislodge scale. For stubborn scale, soak the showerhead in a bag of white vinegar for an hour.
- **Fix (Joint Leak):** Unscrew the showerhead, clean the threads, wrap 5-6 turns of fresh PTFE (Teflon) tape around the thread, and screw it back on firmly.
- **Fix (Continuous Drip):** Replace the cartridge in the wall mixer (requires isolating water).
- **Replace:** If the showerhead is cracked, the finish is ruined, or it's severely clogged inside, a new showerhead is needed.

## When to Call a Plumber
Replacing a shower mixer cartridge can be tricky if the in-wall body is old or corroded. If you are unsure about isolating the water or removing the mixer handle, consult a licensed plumber.
""",

    "running_toilet.md": """# Troubleshooting: Toilet Keeps Running

## Symptoms
- Water continually runs into the bowl after flushing.
- You can hear a constant hissing or trickling sound from the cistern.
- The cistern takes a very long time to fill.

## Likely Causes
1. **Faulty Outlet Valve (Flush Valve) Seal:** The rubber seating washer at the bottom of the outlet valve has blistered, warped, or degraded, allowing water to slowly leak into the bowl.
2. **Faulty Inlet Valve (Fill Valve):** The inlet valve is not shutting off when the water reaches the correct level, causing water to overflow into the overflow pipe and down into the bowl.
3. **Stuck Buttons:** The flush buttons are sticking down, holding the outlet valve open.

## Fix vs Replace
- **Fix:** Both the inlet valve and the outlet valve seal are easily replaceable parts. Caroma outlet seating washers are standard parts available at most hardware stores.
- **Replace:** If the entire toilet suite is over 15 years old, uses excessive water (e.g., 6L/9L flush), or has cracks in the ceramic, upgrading to a modern WELS 4-star Caroma suite (like Urbane II or Luna) will save significant water and money.

## DIY Steps to Check the Outlet Seal
1. Turn off the water supply to the toilet at the mini stop tap on the wall.
2. Flush the toilet to empty the cistern.
3. Remove the cistern lid (you may need to unclip or unscrew the buttons first).
4. Unclip the outlet valve body from the base by twisting it anti-clockwise.
5. Inspect the large rubber washer at the base of the valve. If it feels slimy, blistered, or rigid, it needs replacing.
"""
}

for filename, content in guides.items():
    filepath = os.path.join(troubleshooting_dir, filename)
    with open(filepath, "w") as f:
        f.write(content)
        
print("Updated troubleshooting guides!")
