# 📁 /public/images/ — Photo Upload Folder
# ════════════════════════════════════════════════════════════════════════════
# Place your image files in THIS folder with EXACTLY these filenames.
# The app will automatically load them — no code changes needed.
# ════════════════════════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────────────────────────
FILE 1:  city-seal.png
──────────────────────────────────────────────────────────────────────────────
  WHAT:    Official seal / logo of Calaca City
  WHERE:   Shown in the Header (top-left) on every page
           Shown in the Login page (left panel, center)
           Shown in the Footer
  FORMAT:  PNG with transparent background preferred
  SIZE:    At least 200×200px (square). It will be displayed at 56×56px in header,
           140×140px in login panel.
  EXAMPLE: The circular official seal of Calaca, Batangas

──────────────────────────────────────────────────────────────────────────────
FILE 2:  city-hall-bg.jpg
──────────────────────────────────────────────────────────────────────────────
  WHAT:    Photo of Calaca City Hall or any official government building
  WHERE:   Background image on the Sign Up page (behind the form)
  FORMAT:  JPG or JPEG
  SIZE:    At least 1280×720px (landscape). It will be blurred/darkened slightly.
  EXAMPLE: Exterior photo of Calaca City Hall

──────────────────────────────────────────────────────────────────────────────
FILE 3:  calaca-map.png
──────────────────────────────────────────────────────────────────────────────
  WHAT:    Map of Calaca City showing barangay zones
  WHERE:   Outbreak Monitoring page (used as the base map image)
  FORMAT:  PNG preferred (can also be JPG)
  SIZE:    At least 800×600px. Displayed at ~600×400px on screen.
  EXAMPLE: A barangay map of Calaca downloaded from the LGU or NAMRIA

──────────────────────────────────────────────────────────────────────────────
SUMMARY TABLE
──────────────────────────────────────────────────────────────────────────────
  Filename            Used In                    Required?
  ─────────────────   ────────────────────────   ──────────
  city-seal.png       Header, Login, Footer      YES — shows broken icon if missing
  city-hall-bg.jpg    SignUp page background      NO  — falls back to gradient
  calaca-map.png      Outbreak Monitoring map     NO  — falls back to placeholder

──────────────────────────────────────────────────────────────────────────────
WHERE TO GET THESE IMAGES
──────────────────────────────────────────────────────────────────────────────
  • City Seal:     Ask the Calaca City LGU communications office, or
                   search "Calaca Batangas official seal" on Google Images
  • City Hall:     Take a photo yourself or search Google Maps Street View
  • Calaca Map:    https://www.google.com/maps → search "Calaca, Batangas" →
                   screenshot, or ask MPDC for a barangay map shapefile/image

──────────────────────────────────────────────────────────────────────────────
HOW TO ADD THEM
──────────────────────────────────────────────────────────────────────────────
  1. Put your files in this folder:
       nasaalaga/frontend/public/images/

  2. Make sure the filenames match EXACTLY (lowercase, same extension):
       ✅  city-seal.png
       ✅  city-hall-bg.jpg
       ✅  calaca-map.png
       ❌  City Seal.PNG   ← wrong (uppercase, space)
       ❌  cityseal.png    ← wrong (missing hyphen)

  3. Restart the frontend dev server (Ctrl+C then npm run dev:frontend)
     The images will appear immediately.
