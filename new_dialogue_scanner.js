// New comprehensive dialogue scanner that properly separates and assigns dialogue
function createComprehensiveDialogueScanner() {
    return {
        characters: new Map(), // Map character name to their dialogue array
        narrativeText: '',
        
        scanContent(content) {
            console.log('=== COMPREHENSIVE DIALOGUE SCANNING ===');
            console.log('Content length:', content.length, 'characters');
            
            this.extractAllDialogue(content);
            this.extractNarrativeText(content);
            
            return this.getResults();
        },
        
        extractAllDialogue(content) {
            console.log('\n--- Extracting All Dialogue ---');
            
            // Pattern 1: Character: "Dialogue" (most reliable)
            const colonMatches = [...content.matchAll(/^\s*([A-Z][a-zA-Z\s]{2,25})\s*:\s*[""]([^""]{3,})[""].*$/gm)];
            console.log(`Found ${colonMatches.length} colon format dialogues`);
            
            colonMatches.forEach(match => {
                const character = match[1].trim();
                const dialogue = match[2].trim();
                
                if (this.isValidCharacterName(character)) {
                    this.addDialogue(character, dialogue, 'colon_format');
                    console.log(`✓ ${character}: "${dialogue.substring(0, 40)}..."`);
                }
            });
            
            // Pattern 2: Character said/asked "Dialogue"
            const saidMatches = [...content.matchAll(/([A-Z][a-zA-Z\s]{2,25})\s+(said|asked|replied|whispered|shouted|called|exclaimed|muttered)[\s,:]*[""]([^""]{3,})[""]/gi)];
            console.log(`Found ${saidMatches.length} 'said' format dialogues`);
            
            saidMatches.forEach(match => {
                const character = match[1].trim();
                const dialogue = match[3].trim();
                
                if (this.isValidCharacterName(character)) {
                    this.addDialogue(character, dialogue, 'said_format');
                    console.log(`✓ ${character}: "${dialogue.substring(0, 40)}..."`);
                }
            });
            
            // Pattern 3: "Dialogue," Character said
            const quoteSaidMatches = [...content.matchAll(/[""]([^""]{3,})[""][,.]?\s*([A-Z][a-zA-Z\s]{2,25})\s+(said|asked|replied|whispered|shouted|called|exclaimed|muttered)/gi)];
            console.log(`Found ${quoteSaidMatches.length} 'quote-said' format dialogues`);
            
            quoteSaidMatches.forEach(match => {
                const dialogue = match[1].trim();
                const character = match[2].trim();
                
                if (this.isValidCharacterName(character)) {
                    this.addDialogue(character, dialogue, 'quote_said_format');
                    console.log(`✓ ${character}: "${dialogue.substring(0, 40)}..."`);
                }
            });
        },
        
        isValidCharacterName(name) {
            const invalidWords = ['he', 'she', 'it', 'they', 'the', 'and', 'but', 'that', 'this', 'said', 'asked'];
            const nameLower = name.toLowerCase();
            
            return name.length >= 2 && name.length <= 25 &&
                   /^[A-Z][a-zA-Z\s]*$/.test(name) &&
                   !invalidWords.some(word => nameLower.includes(word));
        },
        
        addDialogue(character, dialogue, format) {
            if (!this.characters.has(character)) {
                this.characters.set(character, []);
            }
            this.characters.get(character).push({
                text: dialogue,
                format: format
            });
        },
        
        extractNarrativeText(content) {
            console.log('\n--- Extracting Narrative Text ---');
            
            // Remove all dialogue to get pure narrative
            let narrative = content
                // Remove colon dialogue lines
                .replace(/^\s*[A-Z][a-zA-Z\s]{2,25}\s*:\s*[""][^""]*[""].*$/gm, '')
                // Remove quoted dialogue with attribution
                .replace(/[""][^""]*[""][\s,]*[A-Z][a-zA-Z\s]{2,25}\s+(said|asked|replied|whispered|shouted|called|exclaimed|muttered)[^.!?]*[.!?]?/gi, '')
                // Remove character said dialogue
                .replace(/[A-Z][a-zA-Z\s]{2,25}\s+(said|asked|replied|whispered|shouted|called|exclaimed|muttered)[\s,:]*[""][^""]*[""][^.!?]*[.!?]?/gi, '')
                // Remove standalone quotes
                .replace(/[""][^""]*[""]/g, '')
                // Clean up extra whitespace
                .replace(/\n\s*\n/g, '\n')
                .replace(/\s+/g, ' ')
                .trim();
            
            this.narrativeText = narrative;
            console.log(`Narrative text extracted (${narrative.length} chars): "${narrative.substring(0, 100)}..."`);
        },
        
        getResults() {
            const results = {
                characters: Array.from(this.characters.keys()),
                dialogueSections: [],
                narrativeText: this.narrativeText
            };
            
            // Convert character dialogues to sections
            let lineNum = 0;
            for (const [character, dialogues] of this.characters.entries()) {
                dialogues.forEach(d => {
                    lineNum++;
                    results.dialogueSections.push({
                        character: character,
                        text: d.text,
                        line: lineNum,
                        type: d.format
                    });
                });
            }
            
            console.log('\n=== EXTRACTION COMPLETE ===');
            console.log(`Characters found: ${results.characters.length}`);
            console.log(`Dialogue sections: ${results.dialogueSections.length}`);
            console.log(`Narrative text length: ${results.narrativeText.length}`);
            
            // Show character distribution
            console.log('\n--- Character Dialogue Distribution ---');
            for (const character of results.characters) {
                const characterDialogues = results.dialogueSections.filter(d => d.character === character);
                console.log(`${character}: ${characterDialogues.length} dialogue(s)`);
                characterDialogues.slice(0, 2).forEach((d, i) => {
                    console.log(`  ${i + 1}. "${d.text.substring(0, 50)}..."`);
                });
            }
            
            return results;
        }
    };
}