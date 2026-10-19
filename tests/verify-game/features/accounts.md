# Accounts and sync

Serve the repository root on localhost or HTTPS. Open `/accounts/`, sign in with an existing grown-up administrator and make a child's login. Additional grown-up accounts can only be created after administrator sign-in. Sign out, then sign in as the child. Use the same login on another browser profile. The child's notebook starts with zero rounds.

Wait for **Games ready for offline play**. Disconnect the first profile, reload Letter Post and complete a B round using its normal listen and picture buttons. Change its color, mute and calm setting. The header must say the changes are saved here while offline. Reconnect it. Sync both profiles. The second notebook must show exactly one round and **First sound**; reopening its world must render the chosen settings and theme. Repeating sync must keep one round.

Run this journey with `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_sync.cjs --live`. It creates real test accounts only on `ixjbgshhzeaosrzavssr`, records the login credentials under `reports/`, checks administrator creation and guardian linking, and asserts a child cannot read or write another child's progress. No screenshots.

Run the same helper without `--live` for a labelled protocol fixture that additionally drops an accepted request's response, tests retry deduplication, signs out with a child's pending edits, and proves another login cannot inherit those edits. It also checks two same-field offline edits whose UUID lexical order opposes their actual edit order, and sign-out during a delayed token refresh.

The game's visit collection deliberately resets on reload. Permanent history and achievements belong to the account notebook and header summary. A fresh login needs connectivity; an already signed-in session can keep playing offline.

Run `node tests/accounts_selection.cjs` for the focused live notebook-selection regression using the retained test credentials. It creates no accounts and changes no saved settings.

Run `node tests/portal_flow.cjs` for fixture checks or `node tests/portal_flow.cjs --live` against the real project. Both cover phone/desktop, light/dark preferences, cream chrome, no play banner or group/code controls, icon and uploaded-picture avatars surviving reload, administrator creation preserving the current session, and anonymous/child account-creation denial. Live runs use the existing administrator in `reports/home-flow-test-logins.json` and create uniquely named test accounts. No screenshots.
