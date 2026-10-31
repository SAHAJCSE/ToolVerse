-- Pasted logo/screenshot links must be http(s), so a stored value can never be a script URL.
create or replace function public.all_http(urls text[]) returns boolean
language sql immutable as $$
  select coalesce(bool_and(u ~* '^https?://'), true) from unnest(urls) u;
$$;
alter table public.ai_tools
  add constraint logo_url_http check (logo_url is null or logo_url ~* '^https?://'),
  add constraint screenshots_http check (public.all_http(screenshots));
insert into public.categories (name, slug, description, icon) values
('AI Chatbots & Assistants','ai-chatbots-assistants','Conversational AI assistants and chatbots.','message-square'),
('AI Coding & Development','ai-coding-development','AI tools for writing, reviewing and shipping code.','code'),
('AI Image Generation','ai-image-generation','Generate images from text and references.','image'),
('AI Video Generation','ai-video-generation','Create and edit video with AI.','video'),
('AI Audio & Music Generation','ai-audio-music','Generate music, sound and audio.','music'),
('AI Writing & Content Creation','ai-writing-content','Draft and refine written content.','pen-line'),
('AI Productivity','ai-productivity','Get more done with AI-powered workflows.','zap'),
('AI Agents','ai-agents','Autonomous agents that complete multi-step tasks.','bot'),
('AI Automation','ai-automation','Automate repetitive business processes.','workflow'),
('AI Research & Education','ai-research-education','Research, learning and study tools.','graduation-cap'),
('AI Presentation Makers','ai-presentation-makers','Generate slides and decks.','presentation'),
('AI Design & Creativity','ai-design-creativity','Design and creative tools.','palette'),
('AI Marketing & SEO','ai-marketing-seo','Marketing, ads and SEO tools.','megaphone'),
('AI Data Analytics','ai-data-analytics','Analyze and visualize data.','bar-chart-3'),
('AI Business Tools','ai-business-tools','AI for operations, sales and support.','briefcase'),
('AI Voice Generation','ai-voice-generation','Text-to-speech and voice cloning.','mic'),
('AI Transcription','ai-transcription','Speech-to-text and meeting notes.','file-audio'),
('AI 3D Generation','ai-3d-generation','Create 3D assets with AI.','box'),
('AI Photo Editing','ai-photo-editing','Retouch and edit photos with AI.','camera'),
('AI Open Source Models','ai-open-source-models','Open-weight and open-source models.','git-branch')
on conflict (slug) do nothing;
-- To make yourself admin after first signup:
-- update public.users set role = 'admin' where email = 'you@example.com';
