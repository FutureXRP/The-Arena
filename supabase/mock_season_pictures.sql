-- Adds pictures and sharper slogans to a mock season that is already loaded.
-- Run 0003_ad_images.sql first. Safe to run more than once.
update ads a
   set headline = v.headline,
       image_url = 'https://picsum.photos/seed/' || regexp_replace(lower(a.brand), '[^a-z0-9]+', '-', 'g') || '/960/540'
  from (values
    ('FutureXRP', 'The ledger never sleeps. Neither do we.'),
    ('Blair Labs', 'Small tools. Sharp edges.'),
    ('Nimbus Coffee', 'Wake up on the right side of the cup.'),
    ('Orbit Fitness', 'Gravity is a suggestion.'),
    ('Paper Trail', 'Receipts in. Calm out.'),
    ('Kelp & Co', 'Snacks from the deep end.'),
    ('Lantern Legal', 'We read the fine print so you never have to.'),
    ('Hollow Oak', 'Furniture your grandkids will argue over.'),
    ('Pixel Pantry', 'Dinner, solved by Tuesday.'),
    ('Tidewater', 'Go where the map goes quiet.'),
    ('Sprocket', 'Fixed by Friday. Guaranteed.'),
    ('Mossbank', 'Get rich the boring way.'),
    ('Quill', 'Say it once. Say it well.'),
    ('Bramble', 'Dirt, with ambition.'),
    ('Halo Audio', 'Hear the room leave.'),
    ('Firefly Tutors', 'Lights on for the hard subjects.'),
    ('Northstar Pets', 'Insurance for the one who cannot read the bill.'),
    ('Crumb', 'Bread arrives. Day improves.')
  ) v(brand, headline)
 where a.brand = v.brand;
