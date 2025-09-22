// Simple, working dialogue scanner
function simpleDialogueScanner(content) {
    console.log('=== SIMPLE DIALOGUE SCANNER ===');
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 200));
    
    const characters = new Set();
    const dialogueSections = [];
    
    // Pattern 1: Character: "Dialogue"
    const colonMatches = content.matchAll(/([A-Z][a-zA-Z\s]{1,25})\s*:\s*[""]([^""]{3,})[""]]/g);
    for (const match of colonMatches) {
        const character = match[1].trim();
        const dialogue = match[2].trim();
        
        console.log(`Colon match: ${character} -> "${dialogue.substring(0, 40)}..."`);
        
        characters.add(character);
        dialogueSections.push({
            character: character,
            text: dialogue,
            type: 'colon_format'
        });
    }
    
    // Pattern 2: Character said "Dialogue"
    const saidMatches = content.matchAll(/([A-Z][a-zA-Z\s]{2,25})\s+(said|asked|replied)\s*[""]([^""]{3,})[""]]/gi);
    for (const match of saidMatches) {
        const character = match[1].trim();
        const dialogue = match[3].trim();
        
        console.log(`Said match: ${character} -> "${dialogue.substring(0, 40)}..."`);
        
        characters.add(character);
        dialogueSections.push({
            character: character,
            text: dialogue,
            type: 'said_format'
        });
    }
    
    console.log(`Found ${characters.size} characters, ${dialogueSections.length} dialogue sections`);
    
    return {
        characters: Array.from(characters),
        dialogueSections: dialogueSections
    };
}