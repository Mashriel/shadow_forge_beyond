# ShadowForge Beyond — Shadowverse: Worlds Beyond Companion

ShadowForge Beyond is an all-in-one companion web application for Shadowverse: Worlds Beyond. Built with React, TypeScript, Vite, and Tailwind CSS, it provides players with advanced deckbuilding tools, collection tracking, crafting planning, mulligan testing, and card analytics.

---

Live site: https://mashriel.github.io/shadow_forge_beyond/

---

## Key Features

### Comprehensive Card Database & Codex
* **Full Card Catalog**: Search and inspect cards across all sets, classes, and card types (Follower, Spell, Amulet).
* **Advanced Filters**: Filter by Class (Forestcraft, Swordcraft, Runecraft, Dragoncraft, Abysscraft, Havencraft, Portalcraft, Neutral), Rarity, Play Point Cost, Format Legality (Rotation vs. Unlimited), and Set Expansion.
* **Keywords & Text Search**: Search card text, skill descriptions, and keywords like Ward, Fanfare, Storm, Last Words, and Evolve.
* **Card Details Modal**: Inspect full card artwork, stats, token cards, related tokens, and evolved forms.

### Interactive Deck Builder
* **Format Legal Validation**: Automatic deck verification checking 40-card deck limits, 3-copy limits, and Rotation set legality.
* **Mana Curve Analytics**: Live visual histogram showing play-point cost distribution and card type breakdown.
* **Collection Sync**: Visual indicators showing how many copies you own in your collection while constructing decks.
* **Import and Export Options**: Export and import decks via Deck Portal string codes, custom JSON deck definitions, and shareable deck summary graphics.

### Collection Manager
* **Playset Tracker**: Track regular and foil copies owned (up to 3x playsets).
* **Ownership Filters**: Instantly view owned cards, missing cards, incomplete playsets, or foils.
* **Quick Deck Import**: Import whole deck requirements directly into your collection.

### Crafting & Vial Planner
* **Vial Budget Calculator**: Plan card crafts using in-game Vial costs across Rarities (Bronze, Silver, Gold, Legendary).
* **Crafting Priorities**: Assign priority tags (Must-Have, High, Medium, Low) to missing cards.
* **Deficit Tracker**: Calculate exact Vials needed vs. Vials owned to complete desired decks.

### Mulligan & Hand Simulator
* **Authentic 4-Card Opening Hand**: Draw initial opening hands and test mulligans.
* **Return-to-Deck Overlay**: Visual markers indicating cards selected to return to the deck for redraws.
* **Draw Probability Engine**: Live mathematical next-draw probabilities for 1-Cost, 2-Cost, and 3-Cost curve cards.

### Set Completion Tracker
* **Expansion Statistics**: Track completion percentage for each card set.
* **Missing Card Gallery**: View missing cards in any set and add them directly to your Craft Planner.

---

## License

Distributed under the MIT License.
