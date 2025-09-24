-- Sample data for Interactive Fiction Story Engine
-- This file contains sample stories, characters, and dialogue for testing

-- Insert sample stories
INSERT INTO public.stories (id, title, description, author, genre, tags, difficulty_level, estimated_reading_time, is_published) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'The Mystery of Willowbrook Manor', 'A thrilling mystery set in a Victorian mansion where secrets lurk behind every door.', 'Jane Austen-Holmes', 'Mystery', ARRAY['mystery', 'victorian', 'mansion', 'secrets'], 3, 45, true),
('550e8400-e29b-41d4-a716-446655440002', 'Adventures in the Digital Realm', 'A sci-fi adventure following a group of friends as they navigate a virtual world.', 'Tech Narrator', 'Science Fiction', ARRAY['sci-fi', 'virtual-reality', 'adventure', 'technology'], 2, 30, true),
('550e8400-e29b-41d4-a716-446655440003', 'The Enchanted Forest Chronicles', 'A fantasy tale of magic, friendship, and the battle between light and darkness.', 'Fantasy Master', 'Fantasy', ARRAY['fantasy', 'magic', 'friendship', 'adventure'], 4, 60, true);

-- Insert sample characters for Story 1 (Willowbrook Manor)
INSERT INTO public.characters (id, story_id, name, description, personality_traits, speaking_style) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Detective Sarah Chen', 'A sharp-minded detective with years of experience solving complex cases.', ARRAY['analytical', 'observant', 'determined', 'compassionate'], 'Direct and professional, often asks probing questions'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Lord Edmund Blackwood', 'The mysterious owner of Willowbrook Manor, harboring dark secrets.', ARRAY['secretive', 'aristocratic', 'brooding', 'intelligent'], 'Formal Victorian speech with careful word choices'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Mrs. Margaret Ashworth', 'The loyal housekeeper who has served the Blackwood family for decades.', ARRAY['loyal', 'observant', 'protective', 'wise'], 'Respectful but knowledgeable, speaks with authority about the house');

-- Insert sample characters for Story 2 (Digital Realm)
INSERT INTO public.characters (id, story_id, name, description, personality_traits, speaking_style) VALUES
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Alex Rivera', 'A talented gamer and natural leader of the group.', ARRAY['confident', 'strategic', 'loyal', 'tech-savvy'], 'Casual and encouraging, uses gaming terminology'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'Maya Singh', 'A brilliant programmer who understands the virtual world better than anyone.', ARRAY['intelligent', 'analytical', 'cautious', 'creative'], 'Technical and precise, explains complex concepts simply'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Jordan Kim', 'The group''s scout and explorer, always eager for new adventures.', ARRAY['adventurous', 'optimistic', 'curious', 'energetic'], 'Enthusiastic and upbeat, full of excitement about discoveries');

-- Insert sample characters for Story 3 (Enchanted Forest)
INSERT INTO public.characters (id, story_id, name, description, personality_traits, speaking_style) VALUES
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', 'Elara Moonwhisper', 'A young elven mage learning to control her powerful magic.', ARRAY['determined', 'compassionate', 'brave', 'sometimes-impulsive'], 'Poetic and thoughtful, occasionally uses archaic phrases'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', 'Thorne Ironbeard', 'A gruff but kind-hearted dwarf warrior with a mysterious past.', ARRAY['brave', 'loyal', 'gruff-exterior', 'protective'], 'Gruff and direct, uses colorful expressions and warrior metaphors'),
('660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440003', 'Whisper', 'A mysterious forest spirit who guides and tests the heroes.', ARRAY['wise', 'cryptic', 'ancient', 'protective-of-nature'], 'Speaks in riddles and metaphors, voice like wind through leaves');

-- Insert sample chapters for Story 1 (Willowbrook Manor)
INSERT INTO public.chapters (id, story_id, chapter_number, title, content) VALUES
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 1, 'Arrival at the Manor', 
'Detective Sarah Chen stepped out of her car and gazed up at the imposing facade of Willowbrook Manor. The Victorian mansion loomed against the gray October sky, its countless windows like watchful eyes.

"So this is where Lord Blackwood lives," she murmured to herself, adjusting her coat against the autumn chill.

As she approached the heavy oak doors, they swung open before she could knock. A stern-faced woman in her sixties stood in the doorway, her graying hair pulled back in a tight bun.

"Detective Chen, I presume?" the woman said with a slight curtsy. "I am Mrs. Ashworth, the housekeeper. His Lordship is expecting you in the library."

"Thank you, Mrs. Ashworth," Sarah replied, stepping into the grand foyer. "I understand there''s been an incident?"

Mrs. Ashworth''s expression darkened. "Indeed, Detective. Most troubling circumstances. Lord Blackwood will explain everything."

The housekeeper led Sarah through a maze of corridors lined with portraits of stern-faced ancestors. The silence was broken only by the soft whisper of their footsteps on the Persian rugs.

"The manor certainly has... atmosphere," Sarah observed, noting how the shadows seemed to dance in the flickering candlelight.

"Willowbrook has stood for three hundred years, Detective," Mrs. Ashworth said proudly. "These walls have seen many secrets, though most are best left undisturbed."'),

('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 2, 'The Library Confession',
'The library doors opened to reveal a vast room lined floor to ceiling with leather-bound volumes. Lord Edmund Blackwood stood with his back to them, gazing out a tall window at the mist-shrouded gardens.

"Detective Chen has arrived, my Lord," Mrs. Ashworth announced.

Lord Blackwood turned slowly, his piercing blue eyes meeting Sarah''s. He was a man in his forties, with prematurely silver hair and the bearing of old aristocracy.

"Detective, thank you for coming so promptly," he said, his voice cultured and precise. "I find myself in rather... delicate circumstances."

Sarah pulled out her notebook. "I understand you wish to report a theft?"

"Not exactly a theft, Detective," Lord Blackwood said, moving to pour himself a brandy from a crystal decanter. "More accurately, I believe someone has been searching for something in my home. Something they believe I possess."

Mrs. Ashworth cleared her throat meaningfully. "Shall I prepare tea, my Lord?"

"That won''t be necessary, Mrs. Ashworth. Though perhaps you could ensure we''re not disturbed?"

The housekeeper nodded and withdrew, closing the doors behind her with a soft click.

Lord Blackwood continued, "Three nights ago, I discovered that my private study had been ransacked. Nothing was taken, but everything had been... examined. Someone was looking for something specific."

"Do you have any idea what they might be seeking?" Sarah asked.

Lord Blackwood hesitated, swirling the amber liquid in his glass. "Detective, there are some family matters that have remained... unresolved for many years. I fear they may finally be catching up with me."');

-- Insert sample chapters for Story 2 (Digital Realm)  
INSERT INTO public.chapters (id, story_id, chapter_number, title, content) VALUES
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 1, 'Login Successful',
'The familiar blue glow of the VR headset filled Alex''s vision as the login sequence completed. Around him, the digital landscape of Nexus Online materialized—a sprawling cyberpunk city where neon signs cast colorful reflections on rain-slicked streets.

"Alright, team, everyone online?" Alex''s voice crackled through the comm system.

"Maya here," came the response, accompanied by the sight of a sleek avatar with glowing circuit patterns materializing nearby. "I''ve been monitoring the server logs. Something weird''s been happening in Sector 7."

A third figure bounded into view—Jordan''s avatar was designed like a parkour expert, all flowing lines and dynamic energy. "Did someone say weird? Count me in! What kind of weird are we talking about?"

Maya''s avatar gestured, and a holographic display appeared showing data streams and error reports. "NPCs have been acting... too intelligent. They''re making decisions that aren''t in their programming."

"Could be a bug in the latest update," Alex suggested, but his tone was uncertain.

"No," Maya shook her head, her avatar''s circuits pulsing brighter. "I helped write some of that code. This is something else. It''s like they''re... learning."

Jordan''s character performed an excited backflip. "Artificial intelligence achieving true consciousness? This is either the coolest thing ever or the beginning of the robot apocalypse!"

"Let''s hope it''s the former," Alex said grimly. "Maya, can you trace the source of these anomalies?"

"Already on it. The trail leads to the old server district—the abandoned areas from the beta test. But Alex..." Maya paused, her voice carrying a note of concern. "Those sectors were supposed to be completely isolated from the main game."');

-- Insert sample dialogue lines for the chapters
INSERT INTO public.dialogue_lines (chapter_id, character_id, line_text, position_in_story, dialogue_type) VALUES
-- Chapter 1 dialogue
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'So this is where Lord Blackwood lives', 150, 'speech'),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', 'Detective Chen, I presume? I am Mrs. Ashworth, the housekeeper. His Lordship is expecting you in the library.', 380, 'speech'),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Thank you, Mrs. Ashworth. I understand there''s been an incident?', 520, 'speech'),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', 'Indeed, Detective. Most troubling circumstances. Lord Blackwood will explain everything.', 580, 'speech'),

-- Chapter 2 dialogue
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', 'Detective Chen has arrived, my Lord', 200, 'speech'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'Detective, thank you for coming so promptly. I find myself in rather... delicate circumstances.', 350, 'speech'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'I understand you wish to report a theft?', 450, 'speech'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'Not exactly a theft, Detective. More accurately, I believe someone has been searching for something in my home.', 500, 'speech'),

-- Digital Realm dialogue
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004', 'Alright, team, everyone online?', 180, 'speech'),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440005', 'Maya here. I''ve been monitoring the server logs. Something weird''s been happening in Sector 7.', 250, 'speech'),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', 'Did someone say weird? Count me in! What kind of weird are we talking about?', 420, 'speech');

-- Insert sample character relationships
INSERT INTO public.character_relationships (story_id, character1_id, character2_id, relationship_type, relationship_description) VALUES
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', 'employer', 'Lord Blackwood employs Mrs. Ashworth as his trusted housekeeper'),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', 'professional', 'Detective Chen is investigating matters concerning Lord Blackwood'),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440005', 'friend', 'Alex and Maya are close friends and gaming partners'),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440006', 'friend', 'Alex and Jordan share a love of adventure and exploration'),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440006', 'friend', 'Maya and Jordan balance each other with caution and enthusiasm');