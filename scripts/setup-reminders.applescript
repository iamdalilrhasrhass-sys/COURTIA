-- COURTIA Rappels — Script à exécuter sur le Mac
-- Usage: osascript setup-reminders.applescript

tell application "Reminders"
    -- Créer ou vider la liste COURTIA
    try
        delete list "COURTIA"
    end try
    set myList to make new list with properties {name:"COURTIA"}
    
    tell myList
        -- Tâche #1: Toujours présente
        make new reminder with properties {name:"Notifier Dalil sur Telegram", body:"REGLES: Apres chaque tache, envoyer rapport Telegram. Obligatoire."}
        
        -- Missions du jour (1er mai 2026)
        make new reminder with properties {name:"Documents Inbox V1 — Backend OK", body:"Migrations, routes, services, stockage. Deploye PM2."}
        make new reminder with properties {name:"Documents Inbox V1 — Frontend OK", body:"Page /documents, store, modals. Build OK, Vercel deploye."}
        make new reminder with properties {name:"ARK Browser Pilot V1 — Backend OK", body:"Playwright + Chromium, route, service, URL allowlist."}
        make new reminder with properties {name:"ARK Browser Pilot V1 — Frontend OK", body:"Page /browser-pilot, builder, historique, presets."}
        make new reminder with properties {name:"Upload public client OK", body:"Page /upload/:token, route publique. Deploye."}
        make new reminder with properties {name:"Email entrant IMAP OK", body:"inboundProcessor enrichi: pièces jointes sauvegardees dans document_uploads."}
        make new reminder with properties {name:"Ameliorations Documents OK", body:"Noms clients, boutons Accepter/Rejeter, endpoint PATCH status."}
        make new reminder with properties {name:"Fix Telegram Gateway OK", body:"Default model deepseek-chat (evite erreur reasoning_content)."}
        make new reminder with properties {name:"Fix rateLimit IPv6 OK", body:"keyGenerator retire de arkLimiter."}
    end tell
    
    set countReminders to count of reminders of myList
    return "Liste COURTIA creee avec " & countReminders & " taches"
end tell
