// Test script to validate AI Detection and Humanization functions
const sampleAIText = `
Chapter 1: The Mysterious Beginning

Furthermore, it was evident that the situation required careful consideration. Additionally, the protagonist had to make a decision that would significantly impact the narrative trajectory. Moreover, the circumstances were complex and multifaceted.

The character approached the door with methodical precision. Subsequently, they examined the environment with thorough attention to detail. The atmosphere was tense and filled with anticipation. Furthermore, the lighting created an ominous ambiance that enhanced the overall dramatic effect.

"I must proceed with caution," the character declared with measured confidence. "This situation demands careful analysis and strategic thinking."

Additionally, it became increasingly apparent that the resolution would require sophisticated problem-solving abilities. Moreover, the complexity of the circumstances necessitated a comprehensive understanding of the underlying factors. Furthermore, the implications were far-reaching and significant.
`;

console.log('Testing AI Detection and Humanization Functions');
console.log('Sample Text Length:', sampleAIText.length);
console.log('Sample Text Preview:', sampleAIText.substring(0, 200) + '...');

// Test patterns that should trigger high AI likelihood:
const aiPatterns = [
    'Furthermore',
    'Additionally', 
    'Moreover',
    'Subsequently',
    'methodical precision',
    'comprehensive understanding',
    'far-reaching and significant'
];

console.log('\\nAI Patterns Found:');
aiPatterns.forEach(pattern => {
    if (sampleAIText.includes(pattern)) {
        console.log('✓ Found:', pattern);
    }
});

console.log('\\nThis sample should score 70-85% AI likelihood.');
console.log('After humanization, it should score 25-35%.');