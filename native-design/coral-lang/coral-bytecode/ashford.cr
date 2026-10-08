// Another World: the native town presentation. Geometry is in ashford.co.
row workspace: ashford title: "Another World - Ashford" windowwidth: 1360 windowheight: 900 background: #101c18 padding: 10 spacing: 14 height: 44
    text "ANOTHER WORLD" size: display color: #d7e2d3 width: 360 height: 44 gap: 0 align: left
    text "ASHFORD   /   FIRST CHAPTER" size: tiny color: #8ea897 height: 44 gap: 0 align: right
    text "09:00   |   18 C" size: small color: #c3d1bd width: 170 height: 44 gap: 0
row padding: 12 spacing: 16 background: #101c18 height: 34
    text "A quiet town. An extraordinary life." size: body color: #dce5d5 height: 34 gap: 0 align: left
    button "Reset view" id: resetViewBtn width: 118 height: 32 gap: 0 background: #273d31 color: #d7e2cd
    button "Town overlook" id: overlookBtn width: 140 height: 32 gap: 0 background: #1b3028 color: #b7c8b5
    button "Hide panel" id: panelBtn width: 118 height: 32 gap: 0 background: #1b3028 color: #b7c8b5
row padding: 16 spacing: 18 background: #101c18 height: "100vh-230"
    scene3d id: worldView height: "100vh-230" gap: 0
    column id: sidepanel width: 254 background: #182b22 border: #2b4233 padding: 18 height: "100vh-266"
        text "YOUR PRESENCE" size: tiny color: #8ba289 height: 24 gap: 14 align: left
        text "Feeling grounded" size: heading color: #e2e8d7 height: 30 gap: 12 align: left
        row height: 24
            text "Confidence" color: #b4c4b1 size: small height: 24 gap: 0 align: left
            text "55" id: confidenceVal color: #d5dfc4 size: small width: 35 height: 24 gap: 0 align: right
        meter value: 55 color: #b8cda1 background: #2a4031 height: 4 gap: 18
        row height: 24
            text "Peace" color: #b4c4b1 size: small height: 24 gap: 0 align: left
            text "55" id: peaceVal color: #d5dfc4 size: small width: 35 height: 24 gap: 0 align: right
        meter value: 55 color: #99bcb0 background: #2a4031 height: 4 gap: 18
        row height: 24
            text "Karma" color: #b4c4b1 size: small height: 24 gap: 0 align: left
            text "55" id: karmaVal color: #d5dfc4 size: small width: 35 height: 24 gap: 0 align: right
        meter value: 55 color: #c6b58a background: #2a4031 height: 4 gap: 18
        row height: 24
            text "Wisdom" color: #b4c4b1 size: small height: 24 gap: 0 align: left
            text "55" id: wisdomVal color: #d5dfc4 size: small width: 35 height: 24 gap: 0 align: right
        meter value: 55 color: #9daec5 background: #2a4031 height: 4 gap: 26
        text "AROUND YOU" size: tiny color: #8ba289 height: 24 gap: 8 align: left
        text "The Corner Cafe" size: small color: #dae3ca height: 26 gap: 0 align: left
        text "A familiar place to begin." size: tiny color: #9bae99 height: 22 gap: 18 align: left
        text "Take a moment. Look around." id: dialogueText size: small color: #cad6bf height: 40 gap: 18 align: left
        button "Hold view" id: holdViewBtn height: 34 background: #283e32 color: #d7e2cd gap: 0
row padding: 8 height: 26 background: #101c18 spacing: 16
    text "ASHFORD  /  MORNING LIGHT" size: tiny color: #8ba289 height: 26 gap: 0 align: left
    text "WASD move    Shift run    Right-drag look" size: tiny color: #c1ceba height: 26 gap: 0 align: right
