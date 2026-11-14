# People: credits

The residents' bodies, hairstyles and animations come from three free packs by Quaternius, released under
CC0 1.0 (public domain; no attribution required, credited here anyway):

- Universal Base Characters (Standard): https://quaternius.com/packs/universalbasecharacters.html
- Universal Animation Library: https://quaternius.com/packs/universalanimationlibrary.html
- Universal Animation Library 2: https://quaternius.com/packs/universalanimationlibrary2.html

`tools/build-people.mjs` made these files from the packs: geometry and skeletons only (skin, clothes and
hair are coloured per person in `people.js`), smaller WebP skin textures, and only the animation clips the
city uses, compressed with meshopt. Support the author: https://www.patreon.com/quaternius
