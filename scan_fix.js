// Replace the entire scanForDialogue function with this working version
async function scanForDialogue() {
    // FORCE CLEAR all cached dialogue data before scanning
    dialogueData.characters = [];
    dialogueData.dialogueSections = [];
    dialogueData.voiceAssignments = {};
    
    // Hide and clear any existing results immediately
    const dialogueAssignments = document.getElementById('dialogueAssignments');
    const dialoguePreview = document.getElementById('dialoguePreview');
    const characterVoiceList = document.getElementById('characterVoiceList');
    const dialogueList = document.getElementById('dialogueList');
    
    if (dialogueAssignments) dialogueAssignments.classList.add('hidden');
    if (dialoguePreview) dialoguePreview.classList.add('hidden');
    if (characterVoiceList) characterVoiceList.innerHTML = '';
    if (dialogueList) dialogueList.innerHTML = '';
    
    // Get content from all chapters (force refresh)
    const content = getAllChaptersText();
    
    if (!content.trim()) {
        showNotification('No story content found. Please generate chapters or write content first.', 'warning');
        return;
    }
    
    console.log('=== FORCED FRESH SCAN ===');
    console.log('Cleared all cached dialogue data');
    console.log('Content to scan:', content.substring(0, 200) + '...');

    const chapterInfo = hasMultipleChapters() ? 
        `Scanning ${storyData.chapters.length} chapters for dialogue and characters...` :
        'Scanning story for dialogue and characters...';
    
    showLoading(chapterInfo);
    
    try {
        let characters = new Set();
        let dialogueSections = [];
        
        console.log('=== SCANNING FOR DIALOGUE ===');
        console.log('Content length:', content.length, 'characters');
        
        // PATTERN 1: Character: "Dialogue" 
        const colonPattern = /([A-Z][a-zA-Z\s]{1,25})\s*:\s*[""]([^""]{5,})[""]]/g;
        let match;
        let foundCount = 0;
        
        console.log('Trying Pattern 1: Character: "Dialogue"');
        while ((match = colonPattern.exec(content)) !== null && foundCount < 100) {
            const character = match[1].trim();
            const dialogue = match[2].trim();
            foundCount++;
            
            console.log(`✓ Match ${foundCount}: "${character}" -> "${dialogue.substring(0, 50)}..."`);
            
            characters.add(character);
            dialogueSections.push({
                character: character,
                text: dialogue,
                line: foundCount,
                type: 'colon_format'
            });
        }
        
        // PATTERN 2: Character said "Dialogue"
        const saidPattern = /([A-Z][a-zA-Z\s]{2,25})\s+(said|asked|replied|whispered|called|shouted)\s*[""]([^""]{5,})[""]]/gi;
        
        console.log('Trying Pattern 2: Character said "Dialogue"');
        while ((match = saidPattern.exec(content)) !== null && foundCount < 200) {
            const character = match[1].trim();
            const dialogue = match[3].trim();
            foundCount++;
            
            console.log(`✓ Match ${foundCount}: "${character}" -> "${dialogue.substring(0, 50)}..."`);
            
            characters.add(character);
            dialogueSections.push({
                character: character,
                text: dialogue,
                line: foundCount,
                type: 'said_format'
            });
        }
        
        console.log(`=== SCAN RESULTS ===`);
        console.log(`Characters found: ${Array.from(characters)}`);
        console.log(`Dialogue sections: ${dialogueSections.length}`);
        
        // Store results
        dialogueData.characters = Array.from(characters);
        dialogueData.dialogueSections = dialogueSections;
        
        hideLoading();
        
        if (dialogueData.characters.length === 0 && dialogueSections.length === 0) {
            showNotification('No dialogue found. Check console for debugging info.', 'warning');
            return;
        }
        
        displayDialogueResults();
        showNotification(`✅ Found ${dialogueData.characters.length} characters and ${dialogueSections.length} dialogue sections`, 'success');

    } catch (error) {
        console.error('Dialogue scanning error:', error);
        hideLoading();
        showNotification(`Failed to scan dialogue: ${error.message}`, 'error');
    }
}