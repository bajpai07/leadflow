# Wireframes (UI source of truth)

The original wireframes were suggested by the brief ("Feel free to change these completely"). Improving them is allowed, but every element listed below must exist.

## 1) LANDING (list screen)

- Top bar: blue trend-line icon + "LeadFlow" (blue, bold) on the left; blue "+ Add New Lead" button on the right.
- Filter row: label "FILTERS:" followed by pill chips. The wireframe shows All (dark filled, selected), New, Contacted, Qualified, Proposal Sent. The brief also requires Won and Lost, so add them.
- Section "📌 TODAY'S FOLLOW-UPS": highlighted light-blue card for Sarah Connor (Acme Corp), purple "PROPOSAL SENT" badge top-right, "Last Note: Sent pricing tier PDF. Said she would review with her boss..." (truncated with ellipsis) and "2 days ago" in muted text, and a blue chip "🔔 Follow-up today at 2:00 PM".
- Section "ALL LEADS": white cards.
  - Hank Scorpio (Globex), green "NEW" badge, "Last Note: Inbound lead from website contact form." 2 hours ago
  - Bill Lumbergh (Initech), yellow "CONTACTED" badge, "Last Note: Left a voicemail with his assistant." 1 week ago
  - Bruce Wayne (Wayne Ent), grey "WON" badge, whole card visually muted, "Last Note: Contract signed! Sending welcome package." 3 weeks ago
- Layout: centered column (~1000px max), light grey page background, section headings uppercase small tracking-wide grey.

## 2) LEAD TIMELINE DIALOG (modal over the list, NOT a new page)

- Header: "Sarah Connor" bold + "(Acme Corp)" muted, phone line "📞 555-0199" below. On the right: a status dropdown (options: New, Contacted, Qualified, Proposal Sent, Won, Lost; current one checked) and an X close button.
- Body: scrollable vertical timeline, newest first, a connector line with dots (latest dot is blue, older dots grey). Each entry: timestamp "May 4, 10:30 AM" + muted "(2 days ago)", then a bordered card with the note text. If a follow-up was set, the card shows a blue chip "📅 Follow-up set for: May 6, 2:00 PM".
  - May 4, 10:30 AM (2 days ago): "Sent pricing tier PDF. Said she would review with her boss." + follow-up chip May 6, 2:00 PM
  - May 1, 09:00 AM (5 days ago): "Initial discovery call. They need a CRM for 50 reps. Pain points include dropping leads and no follow-up tracking."
  - Apr 30, 04:00 PM (6 days ago): "Lead created via web form." (italic, system-style note)
- Footer (fixed at bottom of dialog): textarea placeholder "Log a new discussion...", below it a checkbox "Set Follow-up" with a date input and a time input (enabled only when checked), and a dark "Save Note" button on the right.

## 3) ADD NEW LEAD DIALOG

- Title "Add New Lead" with X close.
- Fields: "Full Name *" (required, red asterisk, placeholder "e.g., John Doe"), "Company (Optional)" (placeholder "e.g., Stark Industries"), "Phone (Optional)" (placeholder "e.g., 555-0123").
- Footer: "Cancel" text button, blue "Save Lead" button. Background list is dimmed and blurred behind the overlay.
