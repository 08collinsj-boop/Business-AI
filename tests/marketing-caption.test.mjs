import assert from 'node:assert/strict';
import test from 'node:test';
import { composeMarketingCaption, normaliseMarketingLineBreaks, marketingCaptionReviewHash } from '../lib/marketing-caption.js';

test('converts escaped newlines and keeps real paragraph breaks', () => {
  assert.equal(normaliseMarketingLineBreaks('First\\n\\nSecond\r\nThird'), 'First\n\nSecond\nThird');
  assert.equal(normaliseMarketingLineBreaks('First\n\nSecond'), 'First\n\nSecond');
});

test('screenshot regression: no literal slashes, duplicate hashtags or repeat CTA', () => {
  const caption = composeMarketingCaption({
    main_copy: 'Out on a job?\\n\\nThe enquiry is captured.\\n\\nInterested? Message the page.\\n\\n#SmallBusiness #Hartlepool #Teesside #BusinessAI',
    call_to_action: 'Message the page to participate in the pilot program.',
    hashtags: ['#SmallBusiness', '#Hartlepool', '#Teesside']
  });
  assert.match(caption, /job\?\n\nThe enquiry/);
  assert.doesNotMatch(caption, /\\n/);
  assert.equal(caption.split('#SmallBusiness').length - 1, 1);
  assert.equal(caption.split('#Hartlepool').length - 1, 1);
  assert.equal(caption.split('#Teesside').length - 1, 1);
  assert.doesNotMatch(caption, /participate in the pilot program/);
  assert.match(caption, /#BusinessAI/);
});

test('preserves a distinct CTA and appends each new hashtag only once', () => {
  assert.equal(
    composeMarketingCaption({main_copy:'We install solar panels. #Solar',call_to_action:'Ask us for a quote.',hashtags:['#Solar','#Teesside','#teesside','#Renewables']}),
    'We install solar panels. #Solar\n\nAsk us for a quote.\n\n#Teesside #Renewables'
  );
});

test('recognises repeated CTA text and remains idempotent', () => {
  const caption = composeMarketingCaption({main_copy:'Message us to book today!',call_to_action:'Message us to book today!',hashtags:[]});
  assert.equal(caption, 'Message us to book today!');
  assert.equal(normaliseMarketingLineBreaks(normaliseMarketingLineBreaks('A\\n\\nB')), 'A\n\nB');
});

test('handles missing and malformed output without inventing text', () => {
  assert.equal(composeMarketingCaption(null), '');
  assert.equal(composeMarketingCaption({main_copy:' Hello.\n\nWorld. ',call_to_action:'',hashtags:[]}), 'Hello.\n\nWorld.');
  assert.equal(composeMarketingCaption({main_copy:'',call_to_action:'Contact us.',hashtags:['#Hartlepool','#hartlepool']}), 'Contact us.\n\n#Hartlepool');
});


test('removes repeated hashtags within main caption, preserving first spelling and order', () => {
  assert.equal(
    composeMarketingCaption({
      main_copy: 'A local update.\\n\\n#BusinessAI #Hartlepool #businessai #Teesside #HARTLEPOOL',
      call_to_action: '',
      hashtags: ['#BusinessAI','#Teesside','#SmallBusiness','#smallbusiness']
    }),
    'A local update.\n\n#BusinessAI #Hartlepool #Teesside\n\n#SmallBusiness'
  );
});

test('deduplicates tags across main paragraphs, CTA and hashtag field', () => {
  assert.equal(
    composeMarketingCaption({
      main_copy: 'We are open. #Local\n\nVisit us. #LOCAL #NorthEast',
      call_to_action: 'Message us for details. #northeast #New',
      hashtags: ['#local','#new','#Different']
    }),
    'We are open. #Local\n\nVisit us. #NorthEast\n\nMessage us for details. #New\n\n#Different'
  );
});

test('removes duplicate-only hashtag paragraphs without creating blank gaps', () => {
  assert.equal(
    composeMarketingCaption({ main_copy:'Welcome! #Local\\n\\n#LOCAL\\n\\nThanks.',call_to_action:'',hashtags:[] }),
    'Welcome! #Local\n\nThanks.'
  );
});

test('tidies spacing and punctuation around removed duplicate inline tags', () => {
  assert.equal(
    composeMarketingCaption({ main_copy:'We help #BusinessAI users.\n\nFind out about #businessai today.',call_to_action:'',hashtags:[] }),
    'We help #BusinessAI users.\n\nFind out about today.'
  );
  assert.equal(
    composeMarketingCaption({ main_copy:'Visit us. #Local. Join #LOCAL.',call_to_action:'',hashtags:[] }),
    'Visit us. #Local. Join.'
  );
});

test('hashtag deduplication is stable and approval hash derives from final caption', () => {
  const original = { main_copy:'Hello #Local #LOCAL', call_to_action:'', hashtags:['#Local'] };
  const caption = composeMarketingCaption(original);
  assert.equal(caption, 'Hello #Local');
  assert.equal(composeMarketingCaption({...original,main_copy:caption}), caption);
  assert.equal(marketingCaptionReviewHash('draft-1',caption),marketingCaptionReviewHash('draft-1',composeMarketingCaption(original)));
  assert.notEqual(marketingCaptionReviewHash('draft-1',caption),marketingCaptionReviewHash('draft-1',caption+' #Another'));
});
