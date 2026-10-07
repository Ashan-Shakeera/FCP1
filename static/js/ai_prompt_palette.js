(function() {
    'use strict';

    // ============================================================
    //  EMBEDDED COLOR DATASET (100 colors · 8 dimensions)
    // ============================================================
    const COLOR_DATA = [
        {"id":1,"name":"Red","hex":"#FF0000","rgb":"255,0,0","cmyk":"0,100,100,0","hsl":"0,100,50","category":"Warm","meaning":"Passion, energy, love, excitement, danger, strength, power, urgency, desire, anger, intensity, action","psychology":"Increases heart rate, stimulates appetite, creates sense of urgency, evokes strong emotions, grabs attention","positive":"Courage, confidence, vitality, warmth, determination, leadership, romance","negative":"Aggression, danger, warning, strain, stress, impatience, domination","industry_usage":["Food & Beverage","Automotive","Sports","Entertainment","Retail","Emergency Services"],"cultural_associations":{"western":"Love, danger, stop, Christmas","eastern":"Good luck, joy, celebration, happiness","african":"Life, health, vitality, spiritual power","indian":"Purity, marriage, passion, sensuality"},"color_wheel_position":"Primary","emotional_impact":9,"attention_grabbing":10,"calming_effect":2},
        {"id":2,"name":"Blue","hex":"#0000FF","rgb":"0,0,255","cmyk":"100,100,0,0","hsl":"240,100,50","category":"Cool","meaning":"Trust, loyalty, wisdom, confidence, intelligence, faith, truth, heaven, stability, calm, depth, peace","psychology":"Lowers heart rate, promotes calmness, increases productivity, creates sense of security, suppresses appetite","positive":"Serenity, reliability, professionalism, integrity, clarity, wisdom, intelligence","negative":"Coldness, aloofness, depression, sadness, rigidity, conservatism","industry_usage":["Technology","Healthcare","Finance","Corporate","Aviation","Legal"],"cultural_associations":{"western":"Trust, authority, sadness, boys","eastern":"Immortality, spirituality, healing, purity","african":"Love, peace, happiness, harmony","indian":"Krishna, courage, determination, protection"},"color_wheel_position":"Primary","emotional_impact":7,"attention_grabbing":6,"calming_effect":10},
        {"id":3,"name":"Yellow","hex":"#FFFF00","rgb":"255,255,0","cmyk":"0,0,100,0","hsl":"60,100,50","category":"Warm","meaning":"Happiness, optimism, energy, warmth, sunshine, creativity, intellect, cheerfulness, hope, enlightenment","psychology":"Stimulates mental activity, increases happiness, grabs attention, promotes optimism, enhances creativity","positive":"Joy, intelligence, curiosity, positivity, brightness, enthusiasm, confidence","negative":"Caution, cowardice, betrayal, anxiety, overstimulation, irrationality","industry_usage":["Food","Entertainment","Education","Transportation","Fashion","Children's Products"],"cultural_associations":{"western":"Happiness, caution, cowardice, Easter","eastern":"Sacred, imperial, power, royalty","african":"Wealth, fertility, beauty, prestige","indian":"Knowledge, learning, happiness, peace"},"color_wheel_position":"Primary","emotional_impact":8,"attention_grabbing":9,"calming_effect":4},
        {"id":4,"name":"Green","hex":"#008000","rgb":"0,128,0","cmyk":"100,0,100,50","hsl":"120,100,25","category":"Cool","meaning":"Nature, growth, harmony, freshness, fertility, renewal, wealth, health, environment, balance, youth, generosity","psychology":"Creates sense of balance, reduces anxiety, promotes healing, encourages relaxation, enhances concentration","positive":"Growth, renewal, peace, security, fertility, environmental awareness, prosperity","negative":"Envy, jealousy, inexperience, sickness, greed, contamination","industry_usage":["Healthcare","Environment","Agriculture","Finance","Education","Wellness"],"cultural_associations":{"western":"Nature, money, envy, luck","eastern":"Eternal life, fertility, new beginnings","african":"Life, growth, harmony, vegetation","indian":"Prosperity, life, happiness, nature"},"color_wheel_position":"Secondary","emotional_impact":6,"attention_grabbing":5,"calming_effect":9},
        {"id":5,"name":"Orange","hex":"#FFA500","rgb":"255,165,0","cmyk":"0,35,100,0","hsl":"39,100,50","category":"Warm","meaning":"Energy, enthusiasm, adventure, warmth, creativity, fun, vitality, endurance, balance, excitement, stimulation","psychology":"Stimulates appetite, encourages social interaction, promotes enthusiasm, creates sense of warmth, increases energy","positive":"Creativity, success, confidence, courage, sociability, optimism, enthusiasm","negative":"Immaturity, superficiality, pride, arrogance, overconfidence","industry_usage":["Food","Sports","Entertainment","Retail","Travel","Automotive"],"cultural_associations":{"western":"Halloween, autumn, creativity, warmth","eastern":"Happiness, love, good fortune, prosperity","african":"Vitality, warmth, life, energy","indian":"Sacred, auspicious, courage, sacrifice"},"color_wheel_position":"Secondary","emotional_impact":8,"attention_grabbing":8,"calming_effect":3},
        {"id":6,"name":"Purple","hex":"#800080","rgb":"128,0,128","cmyk":"0,100,0,50","hsl":"300,100,25","category":"Cool","meaning":"Royalty, luxury, spirituality, mystery, wisdom, magic, creativity, dignity, nobility, ambition, imagination","psychology":"Promotes creativity, induces calmness, creates sense of luxury, encourages introspection, stimulates imagination","positive":"Wisdom, creativity, dignity, ambition, spirituality, sophistication, royalty","negative":"Moodiness, decadence, arrogance, isolation, excess, superiority","industry_usage":["Luxury Goods","Beauty","Spirituality","Technology","Healthcare","Fashion"],"cultural_associations":{"western":"Royalty, wealth, spirituality, Lent","eastern":"Wealth, nobility, spirituality, mourning","african":"Royalty, spirituality, healing, wisdom","indian":"Royalty, wisdom, peace, spirituality"},"color_wheel_position":"Secondary","emotional_impact":6,"attention_grabbing":5,"calming_effect":7},
        {"id":7,"name":"Pink","hex":"#FFC0CB","rgb":"255,192,203","cmyk":"0,25,20,0","hsl":"350,100,88","category":"Warm","meaning":"Love, compassion, nurturing, playfulness, femininity, sweetness, tenderness, romance, innocence, softness","psychology":"Calming effect, reduces aggression, promotes nurturing feelings, creates sense of comfort, encourages emotional expression","positive":"Gentleness, kindness, romance, innocence, playfulness, empathy, nurturing","negative":"Weakness, immaturity, dependency, over-sensitivity, unrealistic expectations","industry_usage":["Beauty","Fashion","Children's Products","Healthcare","Romance","Retail"],"cultural_associations":{"western":"Femininity, romance, breast cancer, valentine","eastern":"Love, happiness, purity, marriage","african":"Gentleness, sweetness, harmony, love","indian":"Pink city Jaipur, hospitality, love"},"color_wheel_position":"Tint","emotional_impact":7,"attention_grabbing":4,"calming_effect":8},
        {"id":8,"name":"Brown","hex":"#A52A2A","rgb":"165,42,42","cmyk":"0,75,75,35","hsl":"0,59,41","category":"Neutral","meaning":"Reliability, stability, earth, comfort, strength, resilience, authenticity, nature, endurance, practicality","psychology":"Creates sense of security, promotes grounding, evokes feelings of comfort, encourages stability, reduces anxiety","positive":"Reliability, honesty, practicality, comfort, strength, earthy, natural","negative":"Boring, conservative, dull, old-fashioned, heavy, unambitious","industry_usage":["Construction","Agriculture","Furniture","Food","Fashion","Outdoor Products"],"cultural_associations":{"western":"Earth, reliability, autumn, simplicity","eastern":"Earth, grounding, stability, tradition","african":"Earth, fertility, wisdom, ancestors","indian":"Earth, stability, strength, simplicity"},"color_wheel_position":"Neutral","emotional_impact":4,"attention_grabbing":2,"calming_effect":6},
        {"id":9,"name":"Black","hex":"#000000","rgb":"0,0,0","cmyk":"0,0,0,100","hsl":"0,0,0","category":"Neutral","meaning":"Elegance, power, sophistication, mystery, strength, formality, prestige, authority, rebellion, death, evil","psychology":"Creates sense of power, conveys sophistication, evokes mystery, suggests authority, can feel overwhelming","positive":"Elegance, sophistication, power, authority, strength, prestige, class","negative":"Death, evil, sadness, negativity, oppression, fear, emptiness","industry_usage":["Luxury","Fashion","Automotive","Technology","Legal","Finance"],"cultural_associations":{"western":"Death, mourning, elegance, sophistication","eastern":"Masculinity, power, health, prosperity","african":"Maturity, wisdom, age, spiritual power","indian":"Anger, darkness, protector, strength"},"color_wheel_position":"Neutral","emotional_impact":7,"attention_grabbing":3,"calming_effect":2},
        {"id":10,"name":"White","hex":"#FFFFFF","rgb":"255,255,255","cmyk":"0,0,0,0","hsl":"0,0,100","category":"Neutral","meaning":"Purity, cleanliness, innocence, simplicity, perfection, peace, clarity, freshness, goodness, sterility, new beginnings","psychology":"Creates sense of space, promotes clarity, suggests cleanliness, evokes peace, encourages organization","positive":"Purity, innocence, cleanliness, simplicity, clarity, peace, goodness","negative":"Sterility, coldness, emptiness, isolation, clinical, impersonal","industry_usage":["Healthcare","Technology","Design","Food","Real Estate","Automotive"],"cultural_associations":{"western":"Purity, weddings, peace, surrender","eastern":"Death, mourning, rebirth, new beginnings","african":"Purity, peace, goodness, spirituality","indian":"Purity, peace, mourning, widowhood"},"color_wheel_position":"Neutral","emotional_impact":5,"attention_grabbing":2,"calming_effect":8},
        {"id":11,"name":"Cyan","hex":"#00FFFF","rgb":"0,255,255","cmyk":"100,0,0,0","hsl":"180,100,50","category":"Cool","meaning":"Clarity, freshness, calm, technology, communication, efficiency, cleanliness, freedom, open spaces, innovation","psychology":"Promotes clarity of thought, induces calmness, enhances creativity, stimulates communication, suggests modernity","positive":"Clarity, freshness, efficiency, calmness, innovation, cleanliness, openness","negative":"Coldness, impersonal, detachment, sterility, emotional distance","industry_usage":["Technology","Healthcare","Design","Environmental","Communications","Travel"],"cultural_associations":{"western":"Technology, calmness, cleanliness, summer","eastern":"Spirituality, immortality, healing, water","african":"Life, fertility, water, healing","indian":"Sky, water, life, creativity"},"color_wheel_position":"Secondary","emotional_impact":5,"attention_grabbing":4,"calming_effect":9},
        {"id":12,"name":"Magenta","hex":"#FF00FF","rgb":"255,0,255","cmyk":"0,100,0,0","hsl":"300,100,50","category":"Cool","meaning":"Creativity, individuality, uniqueness, spirituality, emotional balance, transformation, universal love, non-conformity","psychology":"Stimulates creativity, promotes emotional balance, encourages self-expression, suggests uniqueness, evokes passion","positive":"Creativity, individuality, spirituality, universal love, balance, transformation","negative":"Unrealistic expectations, emotional instability, confusion, rebellion, chaos","industry_usage":["Fashion","Art","LGBTQ+","Design","Beauty","Entertainment"],"cultural_associations":{"western":"Creativity, individuality, feminism, anti-racism","eastern":"Spirituality, creativity, transformation, balance","african":"Life, energy, creativity, transformation","indian":"Spirituality, creativity, love, sacrifice"},"color_wheel_position":"Secondary","emotional_impact":8,"attention_grabbing":9,"calming_effect":3},
        {"id":13,"name":"Teal","hex":"#008080","rgb":"0,128,128","cmyk":"100,0,0,50","hsl":"180,100,25","category":"Cool","meaning":"Calm, balance, clarity, sophistication, stability, self-reliance, renewal, emotional healing, depth, dignity","psychology":"Promotes calmness, enhances clarity of thought, encourages emotional balance, suggests sophistication, aids concentration","positive":"Calmness, balance, sophistication, self-reliance, clarity, healing, dignity","negative":"Aloofness, emotional distance, coldness, rigidity, detachment","industry_usage":["Healthcare","Interior Design","Marine","Technology","Environment","Corporate"],"cultural_associations":{"western":"Calmness, sophistication, 1970s, nautical","eastern":"Healing, spirituality, protection, water","african":"Water, life, healing, spirituality","indian":"Calmness, balance, spirituality, protection"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":3,"calming_effect":9},
        {"id":14,"name":"Lavender","hex":"#E6E6FA","rgb":"230,230,250","cmyk":"8,8,0,2","hsl":"240,67,94","category":"Cool","meaning":"Grace, elegance, sensitivity, femininity, tenderness, serenity, devotion, calm, nostalgia, emotional healing","psychology":"Promotes relaxation, induces calmness, encourages emotional expression, suggests tenderness, aids sleep","positive":"Grace, elegance, sensitivity, tenderness, serenity, devotion, nostalgia","negative":"Over-sensitivity, fragility, emotional dependency, weakness, indecision","industry_usage":["Beauty","Healthcare","Fashion","Interior Design","Floral","Children's Products"],"cultural_associations":{"western":"Romance, elegance, spring, nostalgia","eastern":"Spirituality, purity, healing, devotion","african":"Peace, harmony, spirituality, gentleness","indian":"Purity, spirituality, peace, devotion"},"color_wheel_position":"Tint","emotional_impact":4,"attention_grabbing":1,"calming_effect":9},
        {"id":15,"name":"Coral","hex":"#FF7F50","rgb":"255,127,80","cmyk":"0,50,69,0","hsl":"16,100,66","category":"Warm","meaning":"Energy, warmth, enthusiasm, playfulness, sociability, creativity, vitality, tropical, summer, friendliness","psychology":"Stimulates energy, promotes social interaction, creates sense of warmth, encourages creativity, evokes summer","positive":"Energy, warmth, enthusiasm, sociability, creativity, vitality, friendliness","negative":"Superficiality, immaturity, overstimulation, lack of seriousness","industry_usage":["Fashion","Beauty","Food","Travel","Retail","Weddings"],"cultural_associations":{"western":"Summer, beach, energy, femininity","eastern":"Energy, happiness, celebration, vitality","african":"Life, vitality, energy, celebration","indian":"Celebration, happiness, prosperity, youth"},"color_wheel_position":"Tertiary","emotional_impact":7,"attention_grabbing":7,"calming_effect":4},
        {"id":16,"name":"Turquoise","hex":"#40E0D0","rgb":"64,224,208","cmyk":"71,0,7,12","hsl":"174,72,56","category":"Cool","meaning":"Calm, clarity, communication, emotional balance, protection, wisdom, tropical, serenity, creativity, femininity","psychology":"Promotes clarity of thought, induces calmness, encourages self-expression, provides sense of protection, enhances creativity","positive":"Clarity, calmness, communication, balance, wisdom, protection, creativity","negative":"Emotional dependency, superficiality, unrealistic expectations, instability","industry_usage":["Jewelry","Beauty","Fashion","Design","Healthcare","Travel"],"cultural_associations":{"western":"Tropical, calmness, 1950s, creativity","eastern":"Protection, spirituality, healing, wisdom","african":"Water, life, spirituality, protection","indian":"Royalty, spirituality, protection, wisdom"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":4,"calming_effect":8},
        {"id":17,"name":"Gold","hex":"#FFD700","rgb":"255,215,0","cmyk":"0,16,100,0","hsl":"51,100,50","category":"Warm","meaning":"Wealth, success, luxury, prestige, prosperity, achievement, grandeur, wisdom, enlightenment, divine, royalty","psychology":"Creates sense of prestige, suggests success, evokes luxury, promotes confidence, encourages ambition","positive":"Wealth, success, luxury, prestige, achievement, wisdom, divine","negative":"Greed, materialism, arrogance, superficiality, ostentation","industry_usage":["Luxury Goods","Finance","Jewelry","Awards","Automotive","Real Estate"],"cultural_associations":{"western":"Wealth, success, luxury, Oscar","eastern":"Royalty, prosperity, fortune, divine","african":"Royalty, wealth, divine, prestige","indian":"Divine, wealth, prosperity, wedding"},"color_wheel_position":"Tertiary","emotional_impact":7,"attention_grabbing":7,"calming_effect":3},
        {"id":18,"name":"Silver","hex":"#C0C0C0","rgb":"192,192,192","cmyk":"0,0,0,25","hsl":"0,0,75","category":"Neutral","meaning":"Modernity, technology, innovation, sophistication, elegance, coolness, timelessness, refinement, objectivity","psychology":"Creates sense of modernity, suggests technology, promotes sophistication, evokes coolness, indicates innovation","positive":"Modernity, innovation, sophistication, elegance, technology, refinement","negative":"Coldness, impersonality, emotional distance, sterility, indecision","industry_usage":["Technology","Automotive","Jewelry","Aviation","Design","Finance"],"cultural_associations":{"western":"Modernity, technology, 25th anniversary, innovation","eastern":"Moon, wisdom, prosperity, age","african":"Maturity, wisdom, prestige, age","indian":"Purity, wealth, prestige, moon"},"color_wheel_position":"Neutral","emotional_impact":4,"attention_grabbing":2,"calming_effect":6},
        {"id":19,"name":"Maroon","hex":"#800000","rgb":"128,0,0","cmyk":"0,100,100,50","hsl":"0,100,25","category":"Warm","meaning":"Strength, stability, courage, maturity, passion, depth, tradition, earthiness, durability, ambition, reserved power","psychology":"Creates sense of stability, evokes passion, suggests maturity, promotes courage, indicates depth","positive":"Strength, stability, courage, maturity, passion, depth, tradition","negative":"Dullness, heaviness, aggression, sadness, danger, violence","industry_usage":["Education","Corporate","Sports","Fashion","Publishing","Automotive"],"cultural_associations":{"western":"Harvard, autumn, depth, maturity","eastern":"Strength, power, passion, nobility","african":"Royalty, earth, power, spirituality","indian":"Strength, courage, passion, fertility"},"color_wheel_position":"Shade","emotional_impact":6,"attention_grabbing":4,"calming_effect":4},
        {"id":20,"name":"Navy Blue","hex":"#000080","rgb":"0,0,128","cmyk":"100,100,0,50","hsl":"240,100,25","category":"Cool","meaning":"Authority, power, confidence, professionalism, tradition, stability, integrity, seriousness, depth, loyalty","psychology":"Creates sense of authority, promotes confidence, suggests professionalism, indicates stability, inspires trust","positive":"Authority, power, confidence, professionalism, integrity, tradition, stability","negative":"Coldness, rigidity, aloofness, conservatism, formality","industry_usage":["Corporate","Aviation","Legal","Finance","Military","Education"],"cultural_associations":{"western":"Navy, authority, tradition, seriousness","eastern":"Authority, power, depth, strength","african":"Royalty, power, spirituality, depth","indian":"Depth, power, authority, strength"},"color_wheel_position":"Shade","emotional_impact":6,"attention_grabbing":4,"calming_effect":7},
        {"id":21,"name":"Peach","hex":"#FFDAB9","rgb":"255,218,185","cmyk":"0,15,27,0","hsl":"30,100,86","category":"Warm","meaning":"Warmth, comfort, sweetness, playfulness, youth, health, friendliness, care, nurturing, softness, approachability","psychology":"Creates sense of warmth, promotes friendliness, encourages nurturing, suggests sweetness, evokes comfort","positive":"Warmth, comfort, sweetness, friendliness, youth, health, approachability","negative":"Superficiality, weakness, immaturity, lack of seriousness","industry_usage":["Beauty","Children's Products","Food","Fashion","Healthcare","Weddings"],"cultural_associations":{"western":"Warmth, comfort, youth, spring","eastern":"Happiness, celebration, sweetness, youth","african":"Warmth, life, energy, vitality","indian":"Sweetness, youth, celebration, beauty"},"color_wheel_position":"Tint","emotional_impact":5,"attention_grabbing":3,"calming_effect":7},
        {"id":22,"name":"Olive Green","hex":"#808000","rgb":"128,128,0","cmyk":"0,0,100,50","hsl":"60,100,25","category":"Neutral","meaning":"Peace, stability, growth, nature, resilience, durability, endurance, reliability, comfort, harmony, maturity","psychology":"Creates sense of stability, promotes resilience, suggests endurance, evokes nature, encourages harmony","positive":"Peace, stability, growth, resilience, reliability, harmony, maturity","negative":"Dullness, boredom, old-fashioned, heaviness, uneventful","industry_usage":["Military","Outdoor Products","Agriculture","Design","Fashion","Automotive"],"cultural_associations":{"western":"Military, nature, stability, autumn","eastern":"Harmony, stability, peace, earth","african":"Earth, growth, peace, harmony","indian":"Peace, harmony, nature, stability"},"color_wheel_position":"Tertiary","emotional_impact":4,"attention_grabbing":2,"calming_effect":6},
        {"id":23,"name":"Salmon","hex":"#FA8072","rgb":"250,128,114","cmyk":"0,49,54,2","hsl":"6,93,71","category":"Warm","meaning":"Warmth, enthusiasm, friendliness, energy, compassion, creativity, playfulness, health, optimism, openness","psychology":"Creates sense of warmth, promotes friendliness, encourages compassion, suggests health, evokes creativity","positive":"Warmth, enthusiasm, friendliness, compassion, creativity, health, optimism","negative":"Superficiality, immaturity, emotional dependency, lack of seriousness","industry_usage":["Food","Fashion","Beauty","Healthcare","Children's Products","Travel"],"cultural_associations":{"western":"Health, summer, playfulness, femininity","eastern":"Celebration, happiness, energy, vitality","african":"Life, vitality, energy, health","indian":"Vitality, celebration, happiness, warmth"},"color_wheel_position":"Tertiary","emotional_impact":6,"attention_grabbing":5,"calming_effect":5},
        {"id":24,"name":"Indigo","hex":"#4B0082","rgb":"75,0,130","cmyk":"42,100,0,49","hsl":"275,100,25","category":"Cool","meaning":"Intuition, wisdom, spirituality, depth, mystery, perception, inner wisdom, self-mastery, integrity, idealism","psychology":"Enhances intuition, promotes wisdom, encourages spiritual connection, stimulates deep thinking, aids concentration","positive":"Intuition, wisdom, spirituality, depth, perception, idealism, integrity","negative":"Moodiness, pessimism, isolation, unrealistic idealism, emotional overload","industry_usage":["Spirituality","Technology","Education","Healthcare","Design","Fashion"],"cultural_associations":{"western":"Spirituality, wisdom, depth, New Age","eastern":"Spirituality, wisdom, healing, meditation","african":"Royalty, wisdom, spirituality, power","indian":"Spirituality, wisdom, meditation, wisdom"},"color_wheel_position":"Tertiary","emotional_impact":6,"attention_grabbing":4,"calming_effect":7},
        {"id":25,"name":"Beige","hex":"#F5F5DC","rgb":"245,245,220","cmyk":"0,0,10,4","hsl":"60,56,91","category":"Neutral","meaning":"Calm, simplicity, elegance, warmth, neutrality, reliability, comfort, sophistication, timelessness, subtlety","psychology":"Creates sense of calm, promotes simplicity, suggests elegance, evokes comfort, indicates reliability","positive":"Calmness, simplicity, elegance, warmth, reliability, sophistication, timelessness","negative":"Boredom, dullness, conservatism, lack of character, blandness","industry_usage":["Interior Design","Fashion","Architecture","Real Estate","Food","Publishing"],"cultural_associations":{"western":"Elegance, simplicity, 1950s, minimalist","eastern":"Simplicity, elegance, calmness, tradition","african":"Earth, simplicity, elegance, maturity","indian":"Simplicity, tradition, calmness, spirituality"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":8},
        {"id":26,"name":"Ivory","hex":"#FFFFF0","rgb":"255,255,240","cmyk":"0,0,6,0","hsl":"60,100,97","category":"Neutral","meaning":"Purity, elegance, simplicity, sophistication, calm, timelessness, luxury, cleanliness, peace, tradition","psychology":"Creates sense of elegance, promotes purity, suggests sophistication, evokes calmness, indicates timelessness","positive":"Purity, elegance, simplicity, sophistication, calmness, luxury, tradition","negative":"Coldness, sterility, emptiness, lack of character, aloofness","industry_usage":["Weddings","Interior Design","Fashion","Luxury Goods","Automotive","Stationery"],"cultural_associations":{"western":"Weddings, elegance, tradition, purity","eastern":"Purity, peace, tradition, elegance","african":"Purity, peace, elegance, tradition","indian":"Purity, peace, tradition, wedding"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":9},
        {"id":27,"name":"Khaki","hex":"#C3B091","rgb":"195,176,145","cmyk":"0,10,26,24","hsl":"37,29,67","category":"Neutral","meaning":"Practicality, reliability, earthiness, simplicity, outdoor, ruggedness, durability, comfort, tradition, humility","psychology":"Creates sense of practicality, promotes stability, suggests earthiness, evokes outdoor, indicates reliability","positive":"Practicality, reliability, earthiness, simplicity, comfort, humility, durability","negative":"Blandness, dullness, old-fashioned, lack of ambition, conservatism","industry_usage":["Outdoor Products","Military","Fashion","Agriculture","Construction","Automotive"],"cultural_associations":{"western":"Outdoor, military, practicality, 1940s","eastern":"Simplicity, earth, practicality, tradition","african":"Earth, practicality, humility, wisdom","indian":"Simplicity, earth, practicality, humility"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":6},
        {"id":28,"name":"Rust","hex":"#B7410E","rgb":"183,65,14","cmyk":"0,64,92,28","hsl":"18,86,39","category":"Warm","meaning":"Passion, energy, strength, warmth, earthiness, durability, antiquity, resilience, creativity, tradition, comfort","psychology":"Creates sense of warmth, evokes passion, suggests earthiness, encourages resilience, promotes creativity","positive":"Passion, energy, strength, warmth, durability, creativity, tradition","negative":"Aggression, heaviness, gloom, dullness, decay, old age","industry_usage":["Automotive","Fashion","Interior Design","Construction","Food","Furniture"],"cultural_associations":{"western":"Autumn, earth, durability, 1970s","eastern":"Earth, strength, tradition, warmth","african":"Earth, strength, tradition, resilience","indian":"Strength, earth, passion, warmth"},"color_wheel_position":"Shade","emotional_impact":6,"attention_grabbing":5,"calming_effect":4},
        {"id":29,"name":"Crimson","hex":"#DC143C","rgb":"220,20,60","cmyk":"0,91,73,14","hsl":"348,83,47","category":"Warm","meaning":"Passion, love, power, courage, intensity, drama, determination, ambition, energy, strength, desire, excitement","psychology":"Increases heart rate, stimulates passion, evokes drama, creates sense of urgency, suggests power, encourages determination","positive":"Passion, love, power, courage, intensity, determination, ambition","negative":"Danger, aggression, violence, anger, strain, stress, domination","industry_usage":["Sports","Entertainment","Fashion","Food","Automotive","Education"],"cultural_associations":{"western":"Passion, love, drama, danger","eastern":"Joy, celebration, power, strength","african":"Life, power, spirituality, passion","indian":"Marriage, passion, power, sacrifice"},"color_wheel_position":"Shade","emotional_impact":9,"attention_grabbing":9,"calming_effect":2},
        {"id":30,"name":"Sky Blue","hex":"#87CEEB","rgb":"135,206,235","cmyk":"43,12,0,8","hsl":"197,71,73","category":"Cool","meaning":"Peace, tranquility, clarity, openness, freedom, freshness, optimism, inspiration, calmness, spirituality, serenity","psychology":"Promotes calmness, encourages freedom, suggests openness, inspires creativity, evokes peace, enhances clarity","positive":"Peace, tranquility, clarity, freedom, optimism, inspiration, serenity","negative":"Coldness, impersonality, emotional distance, detachment, fragility","industry_usage":["Travel","Healthcare","Aviation","Technology","Environmental","Children's Products"],"cultural_associations":{"western":"Peace, freedom, clarity, summer","eastern":"Spirituality, peace, clarity, openness","african":"Peace, sky, spirituality, freedom","indian":"Peace, spirituality, sky, freedom"},"color_wheel_position":"Tint","emotional_impact":4,"attention_grabbing":3,"calming_effect":9},
        {"id":31,"name":"Mint Green","hex":"#98FF98","rgb":"152,255,152","cmyk":"40,0,40,0","hsl":"120,100,80","category":"Cool","meaning":"Refreshment, cleanliness, growth, healing, tranquility, youth, vitality, nature, balance, renewal, peace","psychology":"Promotes tranquility, suggests freshness, evokes nature, encourages healing, promotes renewal, enhances balance","positive":"Refreshment, cleanliness, growth, healing, youth, vitality, peace","negative":"Immaturity, blandness, coldness, lack of depth, weakness","industry_usage":["Healthcare","Beauty","Food","Environmental","Wellness","Children's Products"],"cultural_associations":{"western":"Freshness, mint, cleanliness, summer","eastern":"Healing, peace, freshness, vitality","african":"Life, vitality, healing, growth","indian":"Peace, vitality, healing, freshness"},"color_wheel_position":"Tint","emotional_impact":4,"attention_grabbing":3,"calming_effect":8},
        {"id":32,"name":"Forest Green","hex":"#228B22","rgb":"34,139,34","cmyk":"76,0,76,45","hsl":"120,61,34","category":"Cool","meaning":"Growth, vitality, nature, endurance, stability, resilience, prosperity, harmony, life, renewal, balance, health","psychology":"Promotes growth, encourages resilience, suggests nature, enhances stability, evokes harmony, aids concentration","positive":"Growth, vitality, endurance, stability, resilience, prosperity, harmony","negative":"Stagnation, heaviness, conservatism, dullness, envy","industry_usage":["Environmental","Agriculture","Outdoor Products","Sports","Automotive","Construction"],"cultural_associations":{"western":"Nature, growth, stability, autumn","eastern":"Longevity, harmony, growth, vitality","african":"Life, growth, harmony, vitality","indian":"Growth, prosperity, nature, vitality"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":3,"calming_effect":7},
        {"id":33,"name":"Chocolate","hex":"#D2691E","rgb":"210,105,30","cmyk":"0,50,86,18","hsl":"25,75,47","category":"Warm","meaning":"Comfort, warmth, sweetness, reliability, earthiness, indulgence, strength, richness, tradition, stability, durability","psychology":"Creates sense of comfort, evokes sweetness, suggests reliability, promotes warmth, indicates richness, encourages indulgence","positive":"Comfort, warmth, sweetness, reliability, richness, tradition, stability","negative":"Heaviness, dullness, conservatism, old-fashioned, lack of ambition","industry_usage":["Food","Fashion","Interior Design","Cosmetics","Furniture","Automotive"],"cultural_associations":{"western":"Chocolate, comfort, autumn, indulgence","eastern":"Earth, warmth, tradition, sweetness","african":"Earth, sweetness, warmth, tradition","indian":"Sweetness, tradition, warmth, comfort"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":4,"calming_effect":7},
        {"id":34,"name":"Burgundy","hex":"#900020","rgb":"144,0,32","cmyk":"0,100,78,44","hsl":"347,100,28","category":"Warm","meaning":"Power, ambition, wealth, passion, sophistication, depth, intensity, tradition, elegance, mystery, luxury, determination","psychology":"Creates sense of power, evokes passion, suggests sophistication, promotes depth, indicates wealth, encourages ambition","positive":"Power, ambition, wealth, passion, sophistication, depth, tradition","negative":"Danger, aggression, violence, sadness, darkness, aloofness","industry_usage":["Luxury Goods","Fashion","Automotive","Corporate","Wine","Education"],"cultural_associations":{"western":"Wine, wealth, sophistication, autumn","eastern":"Power, wealth, strength, nobility","african":"Royalty, power, wealth, strength","indian":"Power, passion, wealth, sophistication"},"color_wheel_position":"Shade","emotional_impact":7,"attention_grabbing":6,"calming_effect":4},
        {"id":35,"name":"Tan","hex":"#D2B48C","rgb":"210,180,140","cmyk":"0,14,33,18","hsl":"34,44,69","category":"Neutral","meaning":"Comfort, reliability, earthiness, simplicity, warmth, approachability, neutrality, tradition, calm, stability, durability","psychology":"Creates sense of comfort, promotes reliability, suggests earthiness, evokes warmth, indicates approachability, encourages calm","positive":"Comfort, reliability, earthiness, simplicity, warmth, approachability, stability","negative":"Blandness, dullness, conservatism, lack of character, old-fashioned","industry_usage":["Fashion","Interior Design","Furniture","Automotive","Construction","Real Estate"],"cultural_associations":{"western":"Comfort, earth, reliability, 1990s","eastern":"Earth, simplicity, tradition, calm","african":"Earth, reliability, wisdom, tradition","indian":"Earth, simplicity, tradition, comfort"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":7},
        {"id":36,"name":"Plum","hex":"#8E4585","rgb":"142,69,133","cmyk":"0,51,6,44","hsl":"307,35,41","category":"Cool","meaning":"Sophistication, mystery, luxury, creativity, spirituality, elegance, depth, romance, nobility, uniqueness, wisdom","psychology":"Creates sense of sophistication, evokes mystery, suggests luxury, promotes creativity, encourages spiritual connection","positive":"Sophistication, mystery, luxury, creativity, spirituality, elegance, depth","negative":"Moodiness, isolation, sadness, aloofness, depression, unnatural","industry_usage":["Beauty","Fashion","Luxury Goods","Wine","Design","Spirituality"],"cultural_associations":{"western":"Sophistication, mystery, autumn, luxury","eastern":"Spirituality, wealth, nobility, wisdom","african":"Royalty, spirituality, wisdom, power","indian":"Spirituality, wisdom, beauty, nobility"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":4,"calming_effect":6},
        {"id":37,"name":"Lime Green","hex":"#32CD32","rgb":"50,205,50","cmyk":"76,0,76,20","hsl":"120,61,50","category":"Cool","meaning":"Energy, vitality, youth, freshness, enthusiasm, growth, nature, renewal, health, playfulness, innovation, excitement","psychology":"Energizes, promotes vitality, suggests youthfulness, evokes freshness, encourages enthusiasm, stimulates growth","positive":"Energy, vitality, youth, freshness, enthusiasm, growth, playfulness","negative":"Immaturity, overstimulation, artificiality, lack of sophistication","industry_usage":["Sports","Energy Drinks","Fashion","Technology","Children's Products","Environment"],"cultural_associations":{"western":"Energy, youth, summer, 1990s","eastern":"Vitality, growth, energy, youth","african":"Life, vitality, energy, growth","indian":"Vitality, growth, energy, youth"},"color_wheel_position":"Tertiary","emotional_impact":7,"attention_grabbing":8,"calming_effect":3},
        {"id":38,"name":"Lilac","hex":"#C8A2C8","rgb":"200,162,200","cmyk":"0,19,0,22","hsl":"300,26,71","category":"Cool","meaning":"Youth, playfulness, romance, nostalgia, tenderness, grace, elegance, sensitivity, femininity, calm, spirituality","psychology":"Creates sense of calm, promotes tenderness, suggests romance, evokes youth, encourages sensitivity, aids nostalgia","positive":"Youth, playfulness, romance, tenderness, grace, elegance, sensitivity","negative":"Immaturity, weakness, fragility, emotional dependency, indecision","industry_usage":["Beauty","Fashion","Children's Products","Weddings","Floral","Interior Design"],"cultural_associations":{"western":"Spring, romance, nostalgia, femininity","eastern":"Spirituality, youth, tenderness, beauty","african":"Gentleness, beauty, spirituality, youth","indian":"Beauty, spirituality, youth, romance"},"color_wheel_position":"Tint","emotional_impact":4,"attention_grabbing":2,"calming_effect":8},
        {"id":39,"name":"Cream","hex":"#FFFDD0","rgb":"255,253,208","cmyk":"0,1,18,0","hsl":"57,100,91","category":"Neutral","meaning":"Simplicity, elegance, purity, calm, warmth, sophistication, timelessness, comfort, tradition, peace, cleanliness","psychology":"Creates sense of calm, promotes simplicity, suggests elegance, evokes warmth, indicates purity, encourages peace","positive":"Simplicity, elegance, purity, calm, warmth, sophistication, timelessness","negative":"Blandness, lack of character, sterility, coldness, old-fashioned","industry_usage":["Interior Design","Weddings","Luxury Goods","Food","Fashion","Stationery"],"cultural_associations":{"western":"Elegance, simplicity, weddings, tradition","eastern":"Purity, simplicity, elegance, peace","african":"Purity, elegance, peace, tradition","indian":"Purity, peace, elegance, weddings"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":8},
        {"id":40,"name":"Aquamarine","hex":"#7FFFD4","rgb":"127,255,212","cmyk":"50,0,17,0","hsl":"160,100,75","category":"Cool","meaning":"Calm, clarity, healing, rejuvenation, freshness, tranquility, openness, peace, understanding, harmony, youth, beauty","psychology":"Promotes calmness, encourages healing, suggests clarity, evokes rejuvenation, enhances understanding, aids peace","positive":"Calm, clarity, healing, rejuvenation, freshness, tranquility, peace","negative":"Emotional distance, coldness, fragility, lack of depth, weakness","industry_usage":["Jewelry","Healthcare","Travel","Beauty","Environmental","Wellness"],"cultural_associations":{"western":"Water, calmness, clarity, beauty","eastern":"Healing, peace, clarity, water","african":"Water, life, healing, peace","indian":"Peace, healing, clarity, water"},"color_wheel_position":"Tertiary","emotional_impact":4,"attention_grabbing":3,"calming_effect":9},
        {"id":41,"name":"Amethyst","hex":"#9966CC","rgb":"153,102,204","cmyk":"25,50,0,20","hsl":"270,50,60","category":"Cool","meaning":"Spirituality, wisdom, creativity, intuition, serenity, clarity, transformation, healing, nobility, peace, calm, luxury","psychology":"Enhances spirituality, promotes wisdom, encourages creativity, aids intuition, induces serenity, suggests clarity","positive":"Spirituality, wisdom, creativity, intuition, serenity, clarity, healing","negative":"Moodiness, isolation, unrealistic ideals, emotional overload","industry_usage":["Jewelry","Spirituality","Beauty","Luxury Goods","Design","Healthcare"],"cultural_associations":{"western":"Spirituality, wisdom, clarity, February","eastern":"Spirituality, wisdom, healing, clarity","african":"Royalty, spirituality, wisdom, power","indian":"Spirituality, wisdom, nobility, peace"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":4,"calming_effect":7},
        {"id":42,"name":"Bronze","hex":"#CD7F32","rgb":"205,127,50","cmyk":"0,38,76,20","hsl":"30,61,50","category":"Warm","meaning":"Strength, durability, achievement, tradition, stability, resilience, warmth, earthiness, value, antiquity, reliability","psychology":"Creates sense of strength, promotes durability, suggests achievement, evokes tradition, indicates resilience, encourages stability","positive":"Strength, durability, achievement, tradition, stability, resilience, value","negative":"Dullness, old-fashioned, heaviness, lack of ambition, conservatism","industry_usage":["Awards","Construction","Automotive","Fashion","Furniture","Jewelry"],"cultural_associations":{"western":"Bronze Age, achievement, tradition, 3rd place","eastern":"Strength, tradition, earth, value","african":"Earth, strength, tradition, value","indian":"Strength, tradition, earth, value"},"color_wheel_position":"Tertiary","emotional_impact":4,"attention_grabbing":3,"calming_effect":5},
        {"id":43,"name":"Tangerine","hex":"#F28500","rgb":"242,133,0","cmyk":"0,45,100,5","hsl":"33,100,47","category":"Warm","meaning":"Energy, enthusiasm, creativity, warmth, fun, adventure, vitality, happiness, optimism, playfulness, confidence, sunshine","psychology":"Stimulates energy, promotes enthusiasm, encourages creativity, creates warmth, suggests fun, evokes happiness","positive":"Energy, enthusiasm, creativity, warmth, vitality, happiness, optimism","negative":"Overstimulation, immaturity, superficiality, lack of seriousness, aggression","industry_usage":["Food","Sports","Entertainment","Retail","Children's Products","Travel"],"cultural_associations":{"western":"Summer, energy, fun, 1960s","eastern":"Happiness, energy, celebration, vitality","african":"Vitality, energy, life, celebration","indian":"Celebration, energy, happiness, vitality"},"color_wheel_position":"Tertiary","emotional_impact":8,"attention_grabbing":8,"calming_effect":3},
        {"id":44,"name":"Slate Gray","hex":"#708090","rgb":"112,128,144","cmyk":"22,11,0,44","hsl":"210,13,50","category":"Neutral","meaning":"Stability, professionalism, wisdom, maturity, reliability, calmness, practicality, sophistication, neutrality, security","psychology":"Creates sense of stability, promotes professionalism, suggests wisdom, indicates maturity, evokes calmness, aids reliability","positive":"Stability, professionalism, wisdom, maturity, reliability, sophistication, security","negative":"Coldness, dullness, conservatism, lack of emotion, indecision","industry_usage":["Corporate","Technology","Construction","Automotive","Finance","Aviation"],"cultural_associations":{"western":"Professionalism, stability, sophistication, 1980s","eastern":"Wisdom, maturity, stability, practicality","african":"Maturity, wisdom, stability, age","indian":"Wisdom, maturity, stability, professionalism"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":6},
        {"id":45,"name":"Charcoal","hex":"#36454F","rgb":"54,69,79","cmyk":"32,13,0,69","hsl":"204,19,26","category":"Neutral","meaning":"Strength, elegance, formality, mystery, sophistication, depth, authority, reliability, stability, seriousness, resilience","psychology":"Creates sense of strength, promotes elegance, suggests formality, evokes mystery, indicates authority, encourages sophistication","positive":"Strength, elegance, formality, sophistication, depth, authority, reliability","negative":"Darkness, heaviness, sadness, coldness, oppression, gloom","industry_usage":["Automotive","Fashion","Corporate","Technology","Construction","Interior Design"],"cultural_associations":{"western":"Elegance, formality, sophistication, 1920s","eastern":"Strength, authority, depth, formality","african":"Maturity, strength, wisdom, authority","indian":"Strength, authority, depth, formality"},"color_wheel_position":"Neutral","emotional_impact":5,"attention_grabbing":2,"calming_effect":4},
        {"id":46,"name":"Ruby","hex":"#9B111E","rgb":"155,17,30","cmyk":"0,89,81,39","hsl":"354,80,34","category":"Warm","meaning":"Passion, power, love, courage, energy, strength, wealth, intensity, drama, determination, vitality, romance, royalty","psychology":"Increases energy, stimulates passion, evokes courage, creates intensity, suggests power, promotes determination","positive":"Passion, power, love, courage, energy, strength, wealth","negative":"Danger, aggression, violence, anger, stress, domination","industry_usage":["Luxury Goods","Jewelry","Fashion","Automotive","Wine","Entertainment"],"cultural_associations":{"western":"Passion, love, wealth, July","eastern":"Power, wealth, courage, strength","african":"Royalty, power, wealth, spirituality","indian":"Royalty, passion, wealth, power"},"color_wheel_position":"Shade","emotional_impact":9,"attention_grabbing":9,"calming_effect":2},
        {"id":47,"name":"Sapphire","hex":"#0F52BA","rgb":"15,82,186","cmyk":"92,56,0,27","hsl":"216,85,39","category":"Cool","meaning":"Loyalty, trust, wisdom, nobility, sincerity, truth, clarity, integrity, spirituality, calmness, depth, protection","psychology":"Promotes loyalty, encourages trust, suggests wisdom, indicates nobility, evokes clarity, aids integrity, enhances calm","positive":"Loyalty, trust, wisdom, nobility, sincerity, truth, integrity","negative":"Coldness, rigidity, aloofness, formality, emotional distance","industry_usage":["Jewelry","Corporate","Technology","Finance","Aviation","Healthcare"],"cultural_associations":{"western":"Royalty, truth, wisdom, September","eastern":"Wisdom, spirituality, clarity, protection","african":"Royalty, wisdom, spirituality, power","indian":"Royalty, wisdom, spirituality, protection"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":3,"calming_effect":8},
        {"id":48,"name":"Emerald","hex":"#50C878","rgb":"80,200,120","cmyk":"60,0,40,22","hsl":"140,52,55","category":"Cool","meaning":"Growth, renewal, wealth, prosperity, harmony, balance, life, vitality, wisdom, healing, beauty, elegance, fertility","psychology":"Promotes growth, encourages renewal, suggests wealth, evokes harmony, aids balance, enhances healing, promotes vitality","positive":"Growth, renewal, wealth, prosperity, harmony, balance, wisdom","negative":"Envy, greed, inexperience, materialism, imbalance","industry_usage":["Jewelry","Finance","Healthcare","Environmental","Luxury Goods","Beauty"],"cultural_associations":{"western":"Wealth, growth, Ireland, May","eastern":"Wisdom, prosperity, growth, harmony","african":"Life, wealth, growth, vitality","indian":"Royalty, prosperity, wisdom, beauty"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":4,"calming_effect":7},
        {"id":49,"name":"Rose","hex":"#FF007F","rgb":"255,0,127","cmyk":"0,100,50,0","hsl":"330,100,50","category":"Warm","meaning":"Romance, love, femininity, passion, sweetness, tenderness, beauty, elegance, compassion, playfulness, sensitivity","psychology":"Creates sense of romance, promotes love, suggests femininity, evokes sweetness, encourages tenderness, aids playfulness","positive":"Romance, love, femininity, passion, sweetness, tenderness, beauty","negative":"Weakness, over-sensitivity, immaturity, dependency, unrealistic","industry_usage":["Beauty","Fashion","Romance","Weddings","Floral","Children's Products"],"cultural_associations":{"western":"Romance, love, femininity, Valentine","eastern":"Love, beauty, happiness, celebration","african":"Life, love, beauty, celebration","indian":"Romance, beauty, happiness, love"},"color_wheel_position":"Tertiary","emotional_impact":8,"attention_grabbing":7,"calming_effect":5},
        {"id":50,"name":"Periwinkle","hex":"#CCCCFF","rgb":"204,204,255","cmyk":"20,20,0,0","hsl":"240,100,90","category":"Cool","meaning":"Calm, peace, serenity, clarity, creativity, spirituality, harmony, openness, imagination, sweetness, intuition","psychology":"Promotes calmness, encourages creativity, suggests spirituality, evokes clarity, aids harmony, enhances intuition","positive":"Calm, peace, serenity, clarity, creativity, spirituality, harmony","negative":"Emotional distance, coldness, fragility, indecision, lack of depth","industry_usage":["Design","Healthcare","Spirituality","Beauty","Fashion","Children's Products"],"cultural_associations":{"western":"Calm, creativity, spirituality, spring","eastern":"Spirituality, peace, clarity, creativity","african":"Peace, creativity, spirituality, harmony","indian":"Peace, spirituality, creativity, calm"},"color_wheel_position":"Tint","emotional_impact":4,"attention_grabbing":2,"calming_effect":9},
        {"id":51,"name":"Coffee","hex":"#6F4E37","rgb":"111,78,55","cmyk":"0,30,50,56","hsl":"24,34,33","category":"Neutral","meaning":"Warmth, comfort, reliability, earthiness, tradition, sophistication, strength, stability, approachability, simplicity","psychology":"Creates sense of warmth, promotes comfort, suggests reliability, evokes earthiness, indicates tradition, encourages stability","positive":"Warmth, comfort, reliability, tradition, sophistication, strength, stability","negative":"Dullness, heaviness, old-fashioned, boring, lack of excitement","industry_usage":["Food","Furniture","Interior Design","Fashion","Construction","Publishing"],"cultural_associations":{"western":"Coffee, warmth, tradition, comfort","eastern":"Earth, tradition, warmth, comfort","african":"Earth, tradition, strength, warmth","indian":"Warmth, tradition, comfort, earth"},"color_wheel_position":"Neutral","emotional_impact":4,"attention_grabbing":2,"calming_effect":7},
        {"id":52,"name":"Honey","hex":"#FFC30B","rgb":"255,195,11","cmyk":"0,24,96,0","hsl":"45,100,52","category":"Warm","meaning":"Sweetness, optimism, warmth, energy, creativity, happiness, vitality, prosperity, success, friendliness, approachability","psychology":"Creates sense of sweetness, promotes optimism, suggests warmth, evokes energy, encourages creativity, aids happiness","positive":"Sweetness, optimism, warmth, energy, creativity, happiness, prosperity","negative":"Superficiality, immaturity, lack of seriousness, overstimulation","industry_usage":["Food","Beauty","Natural Products","Home Decor","Fashion","Cosmetics"],"cultural_associations":{"western":"Sweetness, warmth, summer, nature","eastern":"Sweetness, prosperity, happiness, nature","african":"Sweetness, vitality, energy, nature","indian":"Sweetness, prosperity, celebration, nature"},"color_wheel_position":"Tertiary","emotional_impact":7,"attention_grabbing":7,"calming_effect":4},
        {"id":53,"name":"Wine","hex":"#722F37","rgb":"114,47,55","cmyk":"0,59,52,55","hsl":"353,42,32","category":"Warm","meaning":"Sophistication, elegance, passion, depth, tradition, luxury, warmth, intensity, maturity, richness, mystery, romance","psychology":"Creates sense of sophistication, evokes passion, suggests depth, promotes elegance, indicates tradition, encourages warmth","positive":"Sophistication, elegance, passion, depth, tradition, luxury, warmth","negative":"Heaviness, sadness, aloofness, darkness, moodiness","industry_usage":["Wine","Fashion","Interior Design","Luxury Goods","Food","Automotive"],"cultural_associations":{"western":"Wine, sophistication, tradition, autumn","eastern":"Sophistication, passion, tradition, warmth","african":"Royalty, sophistication, tradition, passion","indian":"Tradition, passion, sophistication, warmth"},"color_wheel_position":"Shade","emotional_impact":6,"attention_grabbing":4,"calming_effect":5},
        {"id":54,"name":"Butter","hex":"#FFF4A3","rgb":"255,244,163","cmyk":"0,4,36,0","hsl":"53,100,82","category":"Warm","meaning":"Happiness, comfort, warmth, sunshine, optimism, simplicity, nostalgia, friendliness, calmness, creativity, cheerfulness","psychology":"Promotes happiness, creates warmth, suggests comfort, evokes sunshine, encourages optimism, aids creativity","positive":"Happiness, comfort, warmth, optimism, simplicity, friendliness, calmness","negative":"Weakness, blandness, lack of depth, over-simplicity","industry_usage":["Food","Children's Products","Interior Design","Fashion","Stationery","Retail"],"cultural_associations":{"western":"Sunshine, happiness, comfort, 1950s","eastern":"Happiness, warmth, prosperity, simplicity","african":"Happiness, warmth, comfort, vitality","indian":"Happiness, prosperity, warmth, celebration"},"color_wheel_position":"Tint","emotional_impact":6,"attention_grabbing":4,"calming_effect":6},
        {"id":55,"name":"Willow Green","hex":"#9ACD32","rgb":"154,205,50","cmyk":"25,0,76,20","hsl":"80,61,50","category":"Cool","meaning":"Growth, vitality, nature, resilience, flexibility, renewal, energy, harmony, healing, youth, freshness, positivity","psychology":"Promotes growth, suggests resilience, evokes nature, encourages renewal, aids harmony, enhances vitality, creates positivity","positive":"Growth, vitality, resilience, flexibility, renewal, harmony, energy","negative":"Immaturity, lack of depth, overstimulation, artificiality","industry_usage":["Environmental","Agriculture","Sports","Children's Products","Technology","Health"],"cultural_associations":{"western":"Nature, resilience, growth, summer","eastern":"Growth, harmony, vitality, renewal","african":"Life, growth, vitality, nature","indian":"Growth, vitality, nature, resilience"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":5,"calming_effect":6},
        {"id":56,"name":"Mauve","hex":"#E0B0FF","rgb":"224,176,255","cmyk":"12,31,0,0","hsl":"276,100,85","category":"Cool","meaning":"Creativity, spirituality, sensitivity, romance, nostalgia, elegance, uniqueness, gentleness, wisdom, mystery, beauty","psychology":"Promotes creativity, encourages spirituality, suggests sensitivity, evokes romance, aids nostalgia, enhances elegance","positive":"Creativity, spirituality, sensitivity, romance, elegance, uniqueness, gentleness","negative":"Over-sensitivity, weakness, emotional dependency, indecision, fragility","industry_usage":["Beauty","Fashion","Art","Design","Weddings","Floral"],"cultural_associations":{"western":"Romance, nostalgia, elegance, 1980s","eastern":"Spirituality, creativity, beauty, gentleness","african":"Beauty, creativity, spirituality, gentleness","indian":"Beauty, spirituality, creativity, romance"},"color_wheel_position":"Tint","emotional_impact":4,"attention_grabbing":2,"calming_effect":7},
        {"id":57,"name":"Celadon","hex":"#ACE1AF","rgb":"172,225,175","cmyk":"24,0,22,12","hsl":"123,47,78","category":"Cool","meaning":"Calm, peace, healing, renewal, harmony, nature, balance, tranquility, softness, grace, purity, health, gentleness","psychology":"Promotes calmness, encourages healing, suggests renewal, evokes harmony, aids balance, enhances tranquility","positive":"Calm, peace, healing, renewal, harmony, nature, balance","negative":"Weakness, blandness, lack of depth, sterility, coldness","industry_usage":["Healthcare","Interior Design","Ceramics","Beauty","Environmental","Fashion"],"cultural_associations":{"western":"Calm, peace, healing, Japanese","eastern":"Peace, harmony, healing, balance","african":"Peace, life, healing, harmony","indian":"Peace, healing, harmony, calm"},"color_wheel_position":"Tint","emotional_impact":3,"attention_grabbing":1,"calming_effect":9},
        {"id":58,"name":"Cinnamon","hex":"#D2691E","rgb":"210,105,30","cmyk":"0,50,86,18","hsl":"25,75,47","category":"Warm","meaning":"Warmth, comfort, energy, passion, earthiness, tradition, stability, resilience, nurturing, richness, vitality, spice","psychology":"Creates warmth, promotes comfort, suggests energy, evokes passion, indicates earthiness, encourages tradition","positive":"Warmth, comfort, energy, passion, earthiness, tradition, resilience","negative":"Heaviness, dullness, conservatism, over-spiciness, aggression","industry_usage":["Food","Fashion","Interior Design","Spices","Cosmetics","Furniture"],"cultural_associations":{"western":"Spice, warmth, comfort, autumn","eastern":"Warmth, energy, tradition, spice","african":"Earth, warmth, vitality, spice","indian":"Spice, warmth, tradition, energy"},"color_wheel_position":"Tertiary","emotional_impact":6,"attention_grabbing":4,"calming_effect":5},
        {"id":59,"name":"Pewter","hex":"#899499","rgb":"137,148,153","cmyk":"10,3,0,40","hsl":"199,7,57","category":"Neutral","meaning":"Stability, elegance, sophistication, timelessness, reliability, formality, practicality, durability, calmness, maturity","psychology":"Creates stability, promotes elegance, suggests sophistication, evokes timelessness, indicates reliability, aids calmness","positive":"Stability, elegance, sophistication, timelessness, reliability, durability","negative":"Dullness, coldness, lack of emotion, blandness, indecision","industry_usage":["Automotive","Technology","Corporate","Furniture","Jewelry","Architecture"],"cultural_associations":{"western":"Elegance, sophistication, 1950s, timeless","eastern":"Stability, maturity, elegance, durability","african":"Maturity, wisdom, stability, elegance","indian":"Elegance, stability, maturity, durability"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":6},
        {"id":60,"name":"Chestnut","hex":"#954535","rgb":"149,69,53","cmyk":"0,54,64,42","hsl":"10,48,40","category":"Warm","meaning":"Strength, stability, earthiness, warmth, resilience, tradition, reliability, durability, comfort, simplicity, maturity","psychology":"Creates strength, promotes stability, suggests earthiness, evokes warmth, indicates resilience, aids tradition","positive":"Strength, stability, earthiness, warmth, resilience, tradition, reliability","negative":"Heaviness, dullness, conservatism, gloom, lack of ambition","industry_usage":["Furniture","Fashion","Automotive","Construction","Food","Outdoor Products"],"cultural_associations":{"western":"Earth, warmth, tradition, autumn","eastern":"Earth, strength, tradition, warmth","african":"Earth, strength, tradition, wisdom","indian":"Earth, strength, tradition, warmth"},"color_wheel_position":"Shade","emotional_impact":4,"attention_grabbing":2,"calming_effect":6},
        {"id":61,"name":"Steel Blue","hex":"#4682B4","rgb":"70,130,180","cmyk":"61,28,0,29","hsl":"207,44,49","category":"Cool","meaning":"Strength, reliability, professionalism, calmness, stability, intelligence, truth, integrity, clarity, depth, determination","psychology":"Creates strength, promotes reliability, suggests professionalism, evokes calmness, indicates intelligence, aids integrity","positive":"Strength, reliability, professionalism, calmness, stability, intelligence, truth","negative":"Coldness, rigidity, aloofness, emotional distance, formality","industry_usage":["Corporate","Technology","Healthcare","Aviation","Finance","Military"],"cultural_associations":{"western":"Strength, reliability, professionalism, 1980s","eastern":"Strength, wisdom, clarity, professionalism","african":"Strength, reliability, wisdom, professionalism","indian":"Strength, professionalism, wisdom, clarity"},"color_wheel_position":"Tertiary","emotional_impact":4,"attention_grabbing":2,"calming_effect":7},
        {"id":62,"name":"Carnation","hex":"#FFA6C9","rgb":"255,166,201","cmyk":"0,35,21,0","hsl":"336,100,83","category":"Warm","meaning":"Love, devotion, tenderness, femininity, romance, sweetness, beauty, grace, playfulness, innocence, compassion","psychology":"Creates sense of love, promotes devotion, suggests tenderness, evokes femininity, encourages romance, aids sweetness","positive":"Love, devotion, tenderness, femininity, romance, sweetness, beauty","negative":"Over-sensitivity, weakness, immaturity, dependency, lack of seriousness","industry_usage":["Floral","Beauty","Fashion","Weddings","Mother's Day","Children's Products"],"cultural_associations":{"western":"Love, mother, gratitude, January","eastern":"Love, devotion, beauty, tenderness","african":"Life, love, beauty, devotion","indian":"Love, beauty, devotion, celebration"},"color_wheel_position":"Tint","emotional_impact":6,"attention_grabbing":4,"calming_effect":6},
        {"id":63,"name":"Sand","hex":"#C2B280","rgb":"194,178,128","cmyk":"0,8,34,24","hsl":"45,35,63","category":"Neutral","meaning":"Calm, simplicity, earthiness, warmth, stability, reliability, openness, timelessness, peace, nature, tranquility","psychology":"Creates calm, promotes simplicity, suggests earthiness, evokes warmth, indicates stability, aids reliability, encourages peace","positive":"Calm, simplicity, earthiness, warmth, stability, reliability, openness","negative":"Blandness, dullness, lack of character, conservatism, lack of ambition","industry_usage":["Interior Design","Fashion","Construction","Architecture","Real Estate","Travel"],"cultural_associations":{"western":"Beach, desert, nature, calm","eastern":"Earth, simplicity, calm, stability","african":"Earth, desert, stability, nature","indian":"Earth, simplicity, calm, nature"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":8},
        {"id":64,"name":"Flame Red","hex":"#E25822","rgb":"226,88,34","cmyk":"0,61,85,11","hsl":"17,76,51","category":"Warm","meaning":"Passion, energy, intensity, urgency, power, excitement, warmth, ambition, determination, action, vitality, courage","psychology":"Increases heart rate, stimulates energy, creates urgency, evokes passion, promotes determination, encourages action","positive":"Passion, energy, intensity, power, excitement, warmth, ambition","negative":"Aggression, danger, anger, stress, impatience, domination, violence","industry_usage":["Sports","Automotive","Food","Retail","Emergency Services","Entertainment"],"cultural_associations":{"western":"Energy, danger, passion, autumn","eastern":"Energy, celebration, vitality, courage","african":"Life, energy, vitality, passion","indian":"Courage, passion, energy, sacrifice"},"color_wheel_position":"Tertiary","emotional_impact":9,"attention_grabbing":10,"calming_effect":2},
        {"id":65,"name":"Ice Blue","hex":"#99CCFF","rgb":"153,204,255","cmyk":"40,20,0,0","hsl":"210,100,80","category":"Cool","meaning":"Clarity, freshness, calmness, purity, innocence, peace, serenity, openness, coldness, cleanliness, simplicity","psychology":"Promotes clarity, suggests freshness, evokes calmness, indicates purity, aids peace, enhances serenity, encourages openness","positive":"Clarity, freshness, calmness, purity, innocence, peace, serenity","negative":"Coldness, sterility, emotional distance, impersonality, detachment","industry_usage":["Healthcare","Technology","Travel","Cosmetics","Design","Children's Products"],"cultural_associations":{"western":"Winter, ice, cold, clarity","eastern":"Clarity, purity, winter, freshness","african":"Purity, clarity, freshness, water","indian":"Purity, clarity, peace, openness"},"color_wheel_position":"Tint","emotional_impact":3,"attention_grabbing":2,"calming_effect":9},
        {"id":66,"name":"Dandelion","hex":"#F0E130","rgb":"240,225,48","cmyk":"0,6,80,6","hsl":"55,86,56","category":"Warm","meaning":"Sunshine, happiness, optimism, energy, warmth, playfulness, freedom, creativity, vitality, youth, hope, cheerfulness","psychology":"Promotes happiness, creates warmth, suggests optimism, evokes sunshine, encourages creativity, aids playfulness","positive":"Sunshine, happiness, optimism, energy, warmth, playfulness, creativity","negative":"Overstimulation, immaturity, lack of seriousness, superficiality","industry_usage":["Children's Products","Food","Entertainment","Gardening","Fashion","Education"],"cultural_associations":{"western":"Sunshine, spring, childhood, hope","eastern":"Happiness, optimism, energy, youth","african":"Energy, vitality, happiness, sunshine","indian":"Happiness, celebration, energy, optimism"},"color_wheel_position":"Tertiary","emotional_impact":7,"attention_grabbing":7,"calming_effect":4},
        {"id":67,"name":"Denim Blue","hex":"#1560BD","rgb":"21,96,189","cmyk":"89,49,0,26","hsl":"213,80,41","category":"Cool","meaning":"Reliability, practicality, trust, stability, tradition, strength, professionalism, simplicity, durability, integrity","psychology":"Promotes reliability, suggests practicality, creates trust, evokes stability, indicates strength, aids professionalism","positive":"Reliability, practicality, trust, stability, tradition, strength, integrity","negative":"Coldness, rigidity, conservatism, lack of ambition, formality","industry_usage":["Fashion","Automotive","Technology","Corporate","Aviation","Education"],"cultural_associations":{"western":"Jeans, practicality, America, 1950s","eastern":"Reliability, practicality, stability, tradition","african":"Strength, reliability, practicality, tradition","indian":"Reliability, practicality, strength, tradition"},"color_wheel_position":"Tertiary","emotional_impact":4,"attention_grabbing":3,"calming_effect":6},
        {"id":68,"name":"Blush","hex":"#DE5D83","rgb":"222,93,131","cmyk":"0,58,41,13","hsl":"342,66,62","category":"Warm","meaning":"Romance, tenderness, femininity, warmth, compassion, sensitivity, youth, beauty, sweetness, health, love, innocence","psychology":"Creates sense of romance, promotes tenderness, suggests femininity, evokes warmth, encourages compassion, aids beauty","positive":"Romance, tenderness, femininity, warmth, compassion, sensitivity, youth","negative":"Weakness, over-sensitivity, immaturity, dependency, lack of seriousness","industry_usage":["Beauty","Fashion","Healthcare","Cosmetics","Weddings","Children's Products"],"cultural_associations":{"western":"Romance, beauty, femininity, youth","eastern":"Beauty, tenderness, love, youth","african":"Beauty, vitality, love, warmth","indian":"Beauty, romance, love, tenderness"},"color_wheel_position":"Tint","emotional_impact":6,"attention_grabbing":4,"calming_effect":6},
        {"id":69,"name":"Moss Green","hex":"#8A9A5B","rgb":"138,154,91","cmyk":"10,0,41,40","hsl":"75,26,48","category":"Cool","meaning":"Growth, stability, nature, resilience, harmony, peace, earthiness, health, vitality, endurance, balance, tranquility","psychology":"Promotes growth, suggests stability, evokes nature, encourages resilience, aids harmony, enhances balance, creates peace","positive":"Growth, stability, nature, resilience, harmony, health, vitality","negative":"Dullness, stagnation, conservatism, lack of energy, gloom","industry_usage":["Environmental","Outdoor Products","Agriculture","Fashion","Automotive","Interior Design"],"cultural_associations":{"western":"Nature, moss, forest, autumn","eastern":"Harmony, growth, nature, resilience","african":"Life, growth, nature, vitality","indian":"Nature, growth, peace, harmony"},"color_wheel_position":"Tertiary","emotional_impact":4,"attention_grabbing":2,"calming_effect":7},
        {"id":70,"name":"Apricot","hex":"#FBCEB1","rgb":"251,206,177","cmyk":"0,18,29,2","hsl":"23,90,84","category":"Warm","meaning":"Warmth, optimism, cheerfulness, energy, creativity, comfort, friendliness, playfulness, youth, vitality, health, sweetness","psychology":"Creates warmth, promotes optimism, suggests cheerfulness, evokes energy, encourages creativity, aids comfort","positive":"Warmth, optimism, cheerfulness, energy, creativity, comfort, friendliness","negative":"Superficiality, immaturity, lack of seriousness, weakness","industry_usage":["Food","Fashion","Children's Products","Beauty","Interior Design","Travel"],"cultural_associations":{"western":"Summer, warmth, health, comfort","eastern":"Happiness, warmth, energy, vitality","african":"Vitality, warmth, life, energy","indian":"Warmth, happiness, vitality, sweetness"},"color_wheel_position":"Tint","emotional_impact":6,"attention_grabbing":5,"calming_effect":6},
        {"id":71,"name":"Raspberry","hex":"#E30B5C","rgb":"227,11,92","cmyk":"0,95,59,11","hsl":"338,91,47","category":"Warm","meaning":"Passion, sweetness, energy, romance, intensity, femininity, determination, creativity, love, warmth, vitality","psychology":"Creates passion, promotes sweetness, suggests energy, evokes romance, encourages intensity, aids determination","positive":"Passion, sweetness, energy, romance, intensity, femininity, creativity","negative":"Aggression, danger, overstimulation, anger, stress, domination","industry_usage":["Food","Fashion","Beauty","Entertainment","Sports","Retail"],"cultural_associations":{"western":"Sweetness, passion, femininity, summer","eastern":"Energy, sweetness, celebration, vitality","african":"Vitality, life, energy, passion","indian":"Passion, sweetness, celebration, energy"},"color_wheel_position":"Tertiary","emotional_impact":8,"attention_grabbing":8,"calming_effect":3},
        {"id":72,"name":"Lemon","hex":"#FFF700","rgb":"255,247,0","cmyk":"0,3,100,0","hsl":"58,100,50","category":"Warm","meaning":"Happiness, energy, clarity, optimism, freshness, creativity, warmth, intellect, cheerfulness, positivity, stimulation","psychology":"Promotes happiness, stimulates energy, enhances clarity, encourages optimism, suggests freshness, aids creativity","positive":"Happiness, energy, clarity, optimism, freshness, creativity, warmth","negative":"Overstimulation, superficiality, lack of seriousness, anxiety","industry_usage":["Food","Cleaning Products","Education","Entertainment","Children's Products","Wellness"],"cultural_associations":{"western":"Summer, happiness, freshness, energy","eastern":"Happiness, energy, clarity, optimism","african":"Energy, vitality, happiness, sunshine","indian":"Happiness, energy, clarity, celebration"},"color_wheel_position":"Primary","emotional_impact":8,"attention_grabbing":9,"calming_effect":3},
        {"id":73,"name":"Ocean Blue","hex":"#4F94CD","rgb":"79,148,205","cmyk":"61,28,0,20","hsl":"207,56,56","category":"Cool","meaning":"Calm, depth, stability, trust, communication, clarity, freedom, peace, wisdom, reliability, openness, serenity","psychology":"Promotes calmness, suggests depth, creates stability, encourages trust, aids communication, enhances clarity, evokes peace","positive":"Calm, depth, stability, trust, communication, clarity, freedom","negative":"Coldness, aloofness, emotional distance, rigidity, detachment","industry_usage":["Travel","Healthcare","Technology","Maritime","Corporate","Environmental"],"cultural_associations":{"western":"Ocean, calm, depth, peace","eastern":"Water, life, peace, clarity","african":"Water, life, peace, depth","indian":"Depth, peace, clarity, water"},"color_wheel_position":"Tertiary","emotional_impact":4,"attention_grabbing":3,"calming_effect":9},
        {"id":74,"name":"Mahogany","hex":"#C04000","rgb":"192,64,0","cmyk":"0,67,100,25","hsl":"20,100,38","category":"Warm","meaning":"Strength, durability, luxury, tradition, earthiness, stability, richness, sophistication, resilience, warmth, elegance","psychology":"Creates strength, promotes durability, suggests luxury, evokes tradition, indicates earthiness, aids stability, encourages warmth","positive":"Strength, durability, luxury, tradition, earthiness, stability, sophistication","negative":"Heaviness, dullness, gloom, conservatism, old-fashioned","industry_usage":["Furniture","Automotive","Fashion","Construction","Luxury Goods","Wine"],"cultural_associations":{"western":"Wood, luxury, tradition, 1920s","eastern":"Earth, strength, tradition, luxury","african":"Earth, strength, tradition, luxury","indian":"Tradition, strength, earth, luxury"},"color_wheel_position":"Shade","emotional_impact":5,"attention_grabbing":4,"calming_effect":5},
        {"id":75,"name":"Fuschia","hex":"#FF00FF","rgb":"255,0,255","cmyk":"0,100,0,0","hsl":"300,100,50","category":"Warm","meaning":"Creativity, confidence, individuality, passion, intensity, energy, playfulness, uniqueness, expression, boldness, vitality","psychology":"Stimulates creativity, promotes confidence, suggests individuality, evokes passion, encourages intensity, aids expression","positive":"Creativity, confidence, individuality, passion, energy, playfulness, uniqueness","negative":"Overstimulation, unrealistic expectations, emotional instability, chaos","industry_usage":["Fashion","Beauty","Art","Entertainment","LGBTQ+","Technology"],"cultural_associations":{"western":"Creativity, individuality, boldness, 1980s","eastern":"Energy, creativity, uniqueness, expression","african":"Vitality, creativity, energy, uniqueness","indian":"Creativity, celebration, energy, uniqueness"},"color_wheel_position":"Tertiary","emotional_impact":8,"attention_grabbing":9,"calming_effect":2},
        {"id":76,"name":"Saffron","hex":"#F4C430","rgb":"244,196,48","cmyk":"0,20,80,4","hsl":"45,90,57","category":"Warm","meaning":"Spirituality, royalty, prosperity, energy, creativity, warmth, courage, wisdom, transformation, optimism, vitality","psychology":"Promotes spirituality, suggests royalty, evokes prosperity, encourages energy, aids creativity, enhances warmth","positive":"Spirituality, royalty, prosperity, energy, creativity, warmth, courage","negative":"Overstimulation, superficiality, arrogance, extravagance","industry_usage":["Food","Spices","Luxury Goods","Religion","Fashion","Wellness"],"cultural_associations":{"western":"Spice, royalty, autumn, luxury","eastern":"Spirituality, royalty, prosperity, wisdom","african":"Royalty, spirituality, energy, prosperity","indian":"Sacred, royalty, courage, sacrifice"},"color_wheel_position":"Tertiary","emotional_impact":7,"attention_grabbing":7,"calming_effect":4},
        {"id":77,"name":"Jade","hex":"#00A86B","rgb":"0,168,107","cmyk":"100,0,36,34","hsl":"158,100,33","category":"Cool","meaning":"Wisdom, harmony, balance, healing, prosperity, serenity, growth, protection, beauty, value, spirituality, peace","psychology":"Promotes wisdom, encourages harmony, aids balance, suggests healing, evokes prosperity, enhances serenity, protects","positive":"Wisdom, harmony, balance, healing, prosperity, serenity, growth","negative":"Stagnation, coldness, materialism, envy, greed","industry_usage":["Jewelry","Health","Interior Design","Luxury Goods","Spirituality","Beauty"],"cultural_associations":{"western":"Healing, wisdom, luxury, March","eastern":"Wisdom, prosperity, protection, harmony","african":"Life, healing, spirituality, growth","indian":"Wisdom, prosperity, spirituality, protection"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":3,"calming_effect":8},
        {"id":78,"name":"Tawny","hex":"#CD5700","rgb":"205,87,0","cmyk":"0,58,100,20","hsl":"25,100,40","category":"Warm","meaning":"Warmth, energy, passion, earthiness, vitality, strength, autumn, comfort, tradition, determination, resilience, excitement","psychology":"Creates warmth, stimulates energy, evokes passion, suggests earthiness, promotes vitality, aids tradition, encourages resilience","positive":"Warmth, energy, passion, earthiness, vitality, strength, tradition","negative":"Aggression, heaviness, dullness, overstimulation, anger","industry_usage":["Automotive","Food","Fashion","Outdoor Products","Interior Design","Cosmetics"],"cultural_associations":{"western":"Autumn, warmth, tradition, 1970s","eastern":"Earth, energy, tradition, warmth","african":"Earth, warmth, vitality, energy","indian":"Warmth, energy, passion, tradition"},"color_wheel_position":"Shade","emotional_impact":7,"attention_grabbing":6,"calming_effect":4},
        {"id":79,"name":"Misty Rose","hex":"#FFE4E1","rgb":"255,228,225","cmyk":"0,11,12,0","hsl":"6,100,94","category":"Neutral","meaning":"Tenderness, nostalgia, warmth, grace, sensitivity, romance, innocence, comfort, gentleness, love, compassion, softness","psychology":"Creates tenderness, promotes nostalgia, suggests warmth, evokes romance, encourages sensitivity, aids comfort","positive":"Tenderness, nostalgia, warmth, grace, sensitivity, romance, innocence","negative":"Weakness, over-sensitivity, lack of strength, dependency, indecision","industry_usage":["Weddings","Interior Design","Beauty","Fashion","Children's Products","Healthcare"],"cultural_associations":{"western":"Romance, comfort, nostalgia, spring","eastern":"Tenderness, warmth, beauty, love","african":"Gentleness, beauty, love, warmth","indian":"Tenderness, beauty, love, romance"},"color_wheel_position":"Tint","emotional_impact":4,"attention_grabbing":1,"calming_effect":8},
        {"id":80,"name":"Midnight Blue","hex":"#191970","rgb":"25,25,112","cmyk":"78,78,0,56","hsl":"240,64,27","category":"Cool","meaning":"Depth, mystery, power, elegance, wisdom, intelligence, seriousness, nobility, protection, trust, authority, sophistication","psychology":"Creates depth, promotes mystery, suggests power, evokes elegance, indicates wisdom, aids seriousness, encourages protection","positive":"Depth, mystery, power, elegance, wisdom, intelligence, nobility","negative":"Coldness, sadness, depression, aloofness, rigidity, darkness","industry_usage":["Corporate","Automotive","Technology","Aviation","Education","Luxury Goods"],"cultural_associations":{"western":"Night, elegance, mystery, sophistication","eastern":"Depth, power, wisdom, mystery","african":"Power, mystery, wisdom, authority","indian":"Depth, power, authority, mystery"},"color_wheel_position":"Shade","emotional_impact":6,"attention_grabbing":3,"calming_effect":5},
        {"id":81,"name":"Sunflower","hex":"#FFDA03","rgb":"255,218,3","cmyk":"0,15,99,0","hsl":"51,100,51","category":"Warm","meaning":"Happiness, optimism, vitality, energy, warmth, creativity, loyalty, adoration, strength, growth, cheerfulness, positivity","psychology":"Promotes happiness, encourages optimism, stimulates vitality, creates warmth, aids creativity, suggests loyalty, enhances growth","positive":"Happiness, optimism, vitality, energy, warmth, creativity, loyalty","negative":"Overstimulation, superficiality, lack of seriousness, arrogance","industry_usage":["Food","Agriculture","Children's Products","Wellness","Fashion","Gardening"],"cultural_associations":{"western":"Summer, happiness, warmth, loyalty","eastern":"Happiness, optimism, vitality, growth","african":"Vitality, energy, life, happiness","indian":"Happiness, energy, vitality, growth"},"color_wheel_position":"Tertiary","emotional_impact":8,"attention_grabbing":8,"calming_effect":3},
        {"id":82,"name":"Frost","hex":"#EDF5F8","rgb":"237,245,248","cmyk":"4,1,0,3","hsl":"196,44,95","category":"Cool","meaning":"Purity, clarity, peace, calmness, freshness, simplicity, cleanliness, innocence, newness, serenity, sophistication, cleanliness","psychology":"Promotes purity, enhances clarity, encourages peace, suggests freshness, aids calmness, creates simplicity, evokes newness","positive":"Purity, clarity, peace, calmness, freshness, simplicity, cleanliness","negative":"Coldness, sterility, emotional distance, impersonality, emptiness","industry_usage":["Healthcare","Technology","Interior Design","Cosmetics","Winter Products","Luxury Goods"],"cultural_associations":{"western":"Winter, cold, purity, freshness","eastern":"Purity, clarity, winter, peace","african":"Purity, clarity, peace, freshness","indian":"Purity, clarity, peace, calm"},"color_wheel_position":"Tint","emotional_impact":2,"attention_grabbing":1,"calming_effect":9},
        {"id":83,"name":"Myrtle Green","hex":"#317873","rgb":"49,120,115","cmyk":"59,0,4,53","hsl":"176,42,33","category":"Cool","meaning":"Harmony, balance, resilience, nature, growth, stability, calmness, wisdom, protection, healing, elegance, strength","psychology":"Promotes harmony, encourages balance, suggests resilience, evokes nature, aids growth, enhances calmness, protects","positive":"Harmony, balance, resilience, nature, growth, stability, calmness","negative":"Coldness, dullness, stagnation, lack of energy, gloom","industry_usage":["Environmental","Interior Design","Healthcare","Fashion","Garden","Luxury Goods"],"cultural_associations":{"western":"Nature, harmony, calmness, tradition","eastern":"Harmony, balance, wisdom, protection","african":"Life, nature, balance, growth","indian":"Harmony, growth, balance, nature"},"color_wheel_position":"Shade","emotional_impact":4,"attention_grabbing":2,"calming_effect":7},
        {"id":84,"name":"Carmine","hex":"#960018","rgb":"150,0,24","cmyk":"0,100,84,41","hsl":"350,100,29","category":"Warm","meaning":"Passion, courage, intensity, determination, power, energy, strength, drama, excitement, love, urgency, boldness","psychology":"Increases passion, stimulates energy, evokes courage, creates intensity, promotes determination, suggests power, aids strength","positive":"Passion, courage, intensity, determination, power, energy, strength","negative":"Danger, aggression, violence, anger, stress, domination, strain","industry_usage":["Sports","Entertainment","Fashion","Automotive","Food","Retail"],"cultural_associations":{"western":"Passion, intensity, drama, power","eastern":"Power, courage, strength, energy","african":"Life, power, passion, strength","indian":"Sacrifice, courage, passion, power"},"color_wheel_position":"Shade","emotional_impact":9,"attention_grabbing":9,"calming_effect":2},
        {"id":85,"name":"Champagne","hex":"#F7E7CE","rgb":"247,231,206","cmyk":"0,6,17,3","hsl":"37,72,89","category":"Neutral","meaning":"Celebration, elegance, luxury, warmth, sophistication, optimism, joy, success, refinement, class, happiness, festivity","psychology":"Creates celebration, promotes elegance, suggests luxury, evokes warmth, encourages sophistication, aids optimism","positive":"Celebration, elegance, luxury, warmth, sophistication, optimism, joy","negative":"Superficiality, lack of depth, arrogance, pretension","industry_usage":["Luxury Goods","Weddings","Food","Fashion","Automotive","Entertainment"],"cultural_associations":{"western":"Celebration, luxury, elegance, success","eastern":"Celebration, luxury, joy, success","african":"Celebration, success, luxury, elegance","indian":"Celebration, luxury, joy, success"},"color_wheel_position":"Neutral","emotional_impact":6,"attention_grabbing":4,"calming_effect":6},
        {"id":86,"name":"Cobalt Blue","hex":"#0047AB","rgb":"0,71,171","cmyk":"100,58,0,33","hsl":"215,100,34","category":"Cool","meaning":"Clarity, truth, professionalism, loyalty, strength, trust, integrity, wisdom, stability, depth, determination, power","psychology":"Promotes clarity, encourages truth, suggests professionalism, evokes loyalty, indicates strength, aids trust, enhances wisdom","positive":"Clarity, truth, professionalism, loyalty, strength, trust, integrity","negative":"Coldness, rigidity, aloofness, formality, emotional distance","industry_usage":["Corporate","Technology","Healthcare","Aviation","Legal","Finance"],"cultural_associations":{"western":"Professional, trust, authority, 1950s","eastern":"Strength, wisdom, clarity, professionalism","african":"Royalty, strength, wisdom, power","indian":"Professionalism, clarity, strength, wisdom"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":4,"calming_effect":6},
        {"id":87,"name":"Nectarine","hex":"#FFA07A","rgb":"255,160,122","cmyk":"0,37,52,0","hsl":"17,100,74","category":"Warm","meaning":"Warmth, friendliness, energy, creativity, optimism, approachability, vitality, summer, happiness, enthusiasm, sweetness","psychology":"Creates warmth, promotes friendliness, suggests energy, evokes creativity, encourages optimism, aids approachability","positive":"Warmth, friendliness, energy, creativity, optimism, approachability, vitality","negative":"Superficiality, immaturity, overstimulation, lack of seriousness","industry_usage":["Food","Fashion","Beauty","Children's Products","Travel","Interior Design"],"cultural_associations":{"western":"Summer, warmth, vitality, comfort","eastern":"Warmth, energy, happiness, vitality","african":"Vitality, warmth, life, energy","indian":"Warmth, happiness, energy, sweetness"},"color_wheel_position":"Tint","emotional_impact":6,"attention_grabbing":5,"calming_effect":5},
        {"id":88,"name":"Ginger","hex":"#B06500","rgb":"176,101,0","cmyk":"0,43,100,31","hsl":"34,100,35","category":"Warm","meaning":"Warmth, energy, passion, earthiness, vitality, tradition, comfort, strength, resilience, creativity, excitement, spice","psychology":"Creates warmth, stimulates energy, evokes passion, suggests earthiness, promotes vitality, aids tradition, encourages resilience","positive":"Warmth, energy, passion, earthiness, vitality, tradition, comfort","negative":"Aggression, overstimulation, heaviness, dullness, anger","industry_usage":["Food","Fashion","Interior Design","Spices","Cosmetics","Automotive"],"cultural_associations":{"western":"Spice, warmth, tradition, autumn","eastern":"Spice, energy, warmth, vitality","african":"Earth, spice, warmth, vitality","indian":"Spice, energy, tradition, warmth"},"color_wheel_position":"Shade","emotional_impact":6,"attention_grabbing":5,"calming_effect":4},
        {"id":89,"name":"Heliotrope","hex":"#DF73FF","rgb":"223,115,255","cmyk":"13,55,0,0","hsl":"286,100,73","category":"Cool","meaning":"Creativity, spirituality, uniqueness, intuition, sensitivity, mystery, elegance, transformation, imagination, magic","psychology":"Promotes creativity, encourages spirituality, suggests uniqueness, enhances intuition, evokes mystery, aids transformation","positive":"Creativity, spirituality, uniqueness, intuition, sensitivity, mystery, elegance","negative":"Moodiness, isolation, unrealistic ideals, emotional instability, confusion","industry_usage":["Art","Fashion","Spirituality","Beauty","Entertainment","Design"],"cultural_associations":{"western":"Creativity, spirituality, uniqueness, 1990s","eastern":"Spirituality, creativity, intuition, mystery","african":"Creativity, spirituality, uniqueness, power","indian":"Spirituality, creativity, intuition, mystery"},"color_wheel_position":"Tertiary","emotional_impact":6,"attention_grabbing":5,"calming_effect":4},
        {"id":90,"name":"Papaya","hex":"#FF6801","rgb":"255,104,1","cmyk":"0,59,100,0","hsl":"24,100,50","category":"Warm","meaning":"Energy, vitality, warmth, creativity, enthusiasm, summer, excitement, passion, optimism, boldness, adventure, appetite","psychology":"Stimulates energy, promotes vitality, creates warmth, encourages creativity, aids enthusiasm, suggests excitement, awakens appetite","positive":"Energy, vitality, warmth, creativity, enthusiasm, optimism, boldness","negative":"Overstimulation, aggression, impulsivity, lack of restraint","industry_usage":["Food","Fashion","Travel","Sports","Entertainment","Retail"],"cultural_associations":{"western":"Summer, energy, vitality, tropics","eastern":"Energy, vitality, celebration, warmth","african":"Vitality, energy, life, warmth","indian":"Energy, celebration, vitality, warmth"},"color_wheel_position":"Tertiary","emotional_impact":8,"attention_grabbing":8,"calming_effect":3},
        {"id":91,"name":"Porcelain","hex":"#E9E4D4","rgb":"233,228,212","cmyk":"0,2,9,9","hsl":"46,32,87","category":"Neutral","meaning":"Purity, elegance, sophistication, timelessness, calmness, simplicity, perfection, beauty, serenity, refinement, grace","psychology":"Promotes purity, suggests elegance, evokes sophistication, aids timelessness, encourages calmness, creates simplicity","positive":"Purity, elegance, sophistication, timelessness, calmness, simplicity, beauty","negative":"Coldness, sterility, lack of character, blandness, aloofness","industry_usage":["Interior Design","Luxury Goods","Ceramics","Fashion","Weddings","Healthcare"],"cultural_associations":{"western":"Elegance, porcelain, luxury, Chinese","eastern":"Purity, elegance, simplicity, perfection","african":"Purity, elegance, beauty, simplicity","indian":"Purity, elegance, grace, tradition"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":8},
        {"id":92,"name":"Flamingo","hex":"#FC8EAC","rgb":"252,142,172","cmyk":"0,44,32,1","hsl":"344,95,77","category":"Warm","meaning":"Playfulness, joy, energy, warmth, creativity, femininity, love, beauty, sensitivity, youth, vitality, expression","psychology":"Creates playfulness, promotes joy, stimulates energy, evokes warmth, encourages creativity, aids femininity, enhances expression","positive":"Playfulness, joy, energy, warmth, creativity, femininity, love","negative":"Superficiality, immaturity, overstimulation, weakness, dependency","industry_usage":["Fashion","Children's Products","Beauty","Travel","Entertainment","Retail"],"cultural_associations":{"western":"Summer, fun, tropical, 1950s","eastern":"Joy, energy, beauty, warmth","african":"Vitality, joy, beauty, energy","indian":"Celebration, joy, energy, beauty"},"color_wheel_position":"Tint","emotional_impact":7,"attention_grabbing":6,"calming_effect":4},
        {"id":93,"name":"Peridot","hex":"#B4C424","rgb":"180,196,36","cmyk":"8,0,82,23","hsl":"66,69,45","category":"Cool","meaning":"Growth, vitality, prosperity, healing, nature, clarity, renewal, harmony, wisdom, energy, protection, happiness","psychology":"Promotes growth, encourages vitality, suggests prosperity, aids healing, evokes nature, enhances clarity, protects","positive":"Growth, vitality, prosperity, healing, nature, clarity, harmony","negative":"Greed, envy, inexperience, artificiality, imbalance","industry_usage":["Jewelry","Environmental","Health","Agriculture","Beauty","Fashion"],"cultural_associations":{"western":"Growth, vitality, healing, August","eastern":"Growth, harmony, prosperity, vitality","african":"Life, growth, vitality, healing","indian":"Growth, prosperity, wisdom, healing"},"color_wheel_position":"Tertiary","emotional_impact":5,"attention_grabbing":5,"calming_effect":5},
        {"id":94,"name":"Dusty Rose","hex":"#C9A0A5","rgb":"201,160,165","cmyk":"0,20,18,21","hsl":"353,28,71","category":"Neutral","meaning":"Nostalgia, romance, sensitivity, warmth, elegance, comfort, tenderness, femininity, subtlety, grace, vintage, calmness","psychology":"Promotes nostalgia, encourages romance, suggests sensitivity, evokes warmth, aids elegance, creates comfort, enhances tenderness","positive":"Nostalgia, romance, sensitivity, warmth, elegance, comfort, tenderness","negative":"Weakness, over-sensitivity, lack of energy, dullness, indecision","industry_usage":["Interior Design","Fashion","Weddings","Vintage Products","Beauty","Floral"],"cultural_associations":{"western":"Vintage, romance, nostalgia, 1980s","eastern":"Romance, tenderness, beauty, nostalgia","african":"Beauty, romance, tenderness, elegance","indian":"Romance, elegance, tenderness, beauty"},"color_wheel_position":"Tint","emotional_impact":4,"attention_grabbing":2,"calming_effect":7},
        {"id":95,"name":"Titanium White","hex":"#FFFFFF","rgb":"255,255,255","cmyk":"0,0,0,0","hsl":"0,0,100","category":"Neutral","meaning":"Purity, perfection, clarity, cleanliness, simplicity, precision, professionalism, brightness, innocence, truth, newness","psychology":"Promotes purity, suggests perfection, enhances clarity, evokes cleanliness, aids simplicity, indicates professionalism, creates brightness","positive":"Purity, perfection, clarity, cleanliness, simplicity, professionalism, brightness","negative":"Coldness, sterility, emptiness, impersonality, lack of warmth","industry_usage":["Technology","Healthcare","Design","Automotive","Architecture","Publishing"],"cultural_associations":{"western":"Purity, perfection, precision, modernity","eastern":"Purity, perfection, truth, clarity","african":"Purity, clarity, truth, peace","indian":"Purity, truth, clarity, peace"},"color_wheel_position":"Neutral","emotional_impact":4,"attention_grabbing":2,"calming_effect":8},
        {"id":96,"name":"Almond","hex":"#EFDECD","rgb":"239,222,205","cmyk":"0,7,14,6","hsl":"30,52,87","category":"Neutral","meaning":"Warmth, comfort, elegance, simplicity, reliability, approachability, timelessness, subtlety, health, nature, calmness","psychology":"Creates warmth, promotes comfort, suggests elegance, aids simplicity, evokes reliability, encourages approachability","positive":"Warmth, comfort, elegance, simplicity, reliability, approachability, timelessness","negative":"Blandness, lack of character, dullness, conservatism, weakness","industry_usage":["Food","Interior Design","Fashion","Furniture","Cosmetics","Publishing"],"cultural_associations":{"western":"Comfort, nature, simplicity, health","eastern":"Warmth, simplicity, elegance, nature","african":"Earth, warmth, simplicity, nature","indian":"Warmth, simplicity, elegance, nature"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":7},
        {"id":97,"name":"Citron","hex":"#DFA700","rgb":"223,167,0","cmyk":"0,25,100,13","hsl":"45,100,44","category":"Warm","meaning":"Energy, creativity, optimism, warmth, vitality, happiness, stimulation, intellect, courage, success, joy, brightness","psychology":"Stimulates energy, promotes creativity, encourages optimism, creates warmth, aids vitality, enhances happiness, suggests success","positive":"Energy, creativity, optimism, warmth, vitality, happiness, success","negative":"Overstimulation, superficiality, impulsivity, lack of restraint","industry_usage":["Food","Fashion","Interior Design","Automotive","Sports","Retail"],"cultural_associations":{"western":"Energy, summer, optimism, 1970s","eastern":"Energy, vitality, prosperity, happiness","african":"Energy, vitality, happiness, warmth","indian":"Energy, celebration, optimism, warmth"},"color_wheel_position":"Tertiary","emotional_impact":7,"attention_grabbing":7,"calming_effect":3},
        {"id":98,"name":"Fawn","hex":"#E5AA70","rgb":"229,170,112","cmyk":"0,26,51,10","hsl":"30,69,67","category":"Neutral","meaning":"Warmth, comfort, reliability, earthiness, gentleness, approachability, simplicity, stability, resilience, tenderness","psychology":"Creates warmth, promotes comfort, suggests reliability, evokes earthiness, encourages gentleness, aids approachability","positive":"Warmth, comfort, reliability, earthiness, gentleness, approachability, simplicity","negative":"Blandness, dullness, lack of ambition, weakness, conservatism","industry_usage":["Fashion","Interior Design","Furniture","Outdoor Products","Automotive","Cosmetics"],"cultural_associations":{"western":"Earth, warmth, comfort, simplicity","eastern":"Earth, warmth, reliability, simplicity","african":"Earth, warmth, reliability, nature","indian":"Earth, warmth, simplicity, comfort"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":7},
        {"id":99,"name":"Vivid Violet","hex":"#9F00FF","rgb":"159,0,255","cmyk":"38,100,0,0","hsl":"277,100,50","category":"Cool","meaning":"Spirituality, creativity, passion, individuality, mystery, uniqueness, intensity, imagination, transformation, magic","psychology":"Enhances spirituality, stimulates creativity, evokes passion, suggests individuality, promotes mystery, aids transformation","positive":"Spirituality, creativity, passion, individuality, mystery, uniqueness, intensity","negative":"Moodiness, chaos, emotional instability, unrealistic ideals, isolation","industry_usage":["Art","Fashion","Spirituality","Entertainment","Technology","Beauty"],"cultural_associations":{"western":"Spirituality, creativity, uniqueness, 1990s","eastern":"Spirituality, creativity, power, mystery","african":"Spirituality, creativity, power, uniqueness","indian":"Spirituality, creativity, passion, power"},"color_wheel_position":"Tertiary","emotional_impact":7,"attention_grabbing":8,"calming_effect":3},
        {"id":100,"name":"Cool Gray","hex":"#8C92AC","rgb":"140,146,172","cmyk":"19,15,0,33","hsl":"229,16,61","category":"Neutral","meaning":"Professionalism, stability, sophistication, calmness, reliability, intelligence, neutrality, practicality, wisdom, maturity","psychology":"Promotes professionalism, encourages stability, suggests sophistication, evokes calmness, aids reliability, enhances intelligence","positive":"Professionalism, stability, sophistication, calmness, reliability, intelligence, neutrality","negative":"Coldness, dullness, emotional distance, indecision, lack of energy","industry_usage":["Corporate","Technology","Architecture","Automotive","Finance","Education"],"cultural_associations":{"western":"Professionalism, stability, sophistication, 2010s","eastern":"Wisdom, maturity, stability, professionalism","african":"Maturity, wisdom, stability, professionalism","indian":"Professionalism, wisdom, stability, maturity"},"color_wheel_position":"Neutral","emotional_impact":3,"attention_grabbing":1,"calming_effect":7}
    ];

    // Build lookup
    const colorMap = {};
    COLOR_DATA.forEach(c => {
        colorMap[c.hex.toUpperCase()] = c;
        colorMap[c.name.toLowerCase()] = c;
    });

    // ============================================================
    //  CORE APP STATE
    // ============================================================
    let activeColorHex = "#3b82f6";
    let activeColorData = null;

    const canvas = document.getElementById('colorWheelCanvas');
    const ctx = canvas.getContext('2d');
    const W = 300, H = 300;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2, cy = H / 2, radius = 140;
    let wheelImageData = null;

    // ---------- UTILITIES ----------
    function hexToRgb(hex) {
        let h = hex.slice(1);
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
    }

    function rgbToHex(r, g, b) { return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }

    function hslToRgb(h, s, l) {
        h = (h % 360 + 360) % 360;
        s = Math.min(1, Math.max(0, s));
        l = Math.min(1, Math.max(0, l));
        let c = (1 - Math.abs(2 * l - 1)) * s;
        let hp = h / 60;
        let x = c * (1 - Math.abs((hp % 2) - 1));
        let r1 = 0, g1 = 0, b1 = 0;
        if (hp <= 1) { r1 = c; g1 = x; b1 = 0; }
        else if (hp <= 2) { r1 = x; g1 = c; b1 = 0; }
        else if (hp <= 3) { r1 = 0; g1 = c; b1 = x; }
        else if (hp <= 4) { r1 = 0; g1 = x; b1 = c; }
        else if (hp <= 5) { r1 = x; g1 = 0; b1 = c; }
        else { r1 = c; g1 = 0; b1 = x; }
        let m = l - c / 2;
        return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
    }

    function hslToHex(h, s, l) { let [r, g, b] = hslToRgb(h, s, l); return rgbToHex(r, g, b); }

    function hexToHsl(hex) {
        let [r, g, b] = hexToRgb(hex);
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }
        return [h, s, l];
    }

    function getLuminance(hex) {
        let [r, g, b] = hexToRgb(hex);
        let rs = r / 255, gs = g / 255, bs = b / 255;
        let rLin = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
        let gLin = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
        let bLin = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
        return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
    }

    function getContrastTextColor(hex) { return getLuminance(hex) > 0.179 ? "#000000" : "#FFFFFF"; }

    function findColorData(hex) {
        const u = hex.toUpperCase();
        if (colorMap[u]) return colorMap[u];
        let best = null, bestDist = Infinity;
        for (const c of COLOR_DATA) {
            const dist = Math.abs(parseInt(c.hex.slice(1), 16) - parseInt(u.slice(1), 16));
            if (dist < bestDist) { bestDist = dist; best = c; }
        }
        return bestDist < 1000 ? best : null;
    }

    // ---------- WHEEL ----------
    function buildWheelImageData() {
        const imgData = ctx.createImageData(W, H);
        const data = imgData.data;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy);
                if (dist <= radius) {
                    let sat = dist / radius;
                    let angle = Math.atan2(dy, dx);
                    let hue = (angle * 180 / Math.PI + 360) % 360;
                    let [r, g, b] = hslToRgb(hue, sat, 0.5);
                    const idx = (y * W + x) * 4;
                    data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
                } else {
                    const idx = (y * W + x) * 4;
                    data[idx] = 30; data[idx + 1] = 34; data[idx + 2] = 42; data[idx + 3] = 255;
                }
            }
        }
        return imgData;
    }

    function drawWheelWithMarker() {
        if (!wheelImageData) wheelImageData = buildWheelImageData();
        ctx.putImageData(wheelImageData, 0, 0);
        let [hue, sat, light] = hexToHsl(activeColorHex);
        let angleRad = (hue * Math.PI) / 180;
        let markerRadius = sat * radius;
        let markX = cx + markerRadius * Math.cos(angleRad);
        let markY = cy + markerRadius * Math.sin(angleRad);
        ctx.beginPath();
        ctx.arc(markX, markY, 9, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(markX, markY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = activeColorHex;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(markX, markY, 7, 0, 2 * Math.PI);
        ctx.stroke();
    }

    function pickColorFromWheel(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
        let clientX = e.clientX || (e.touches && e.touches[0].clientX);
        let clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (clientX == null) return;
        let mx = (clientX - rect.left) * scaleX, my = (clientY - rect.top) * scaleY;
        let dx = mx - cx, dy = my - cy, dist = Math.hypot(dx, dy);
        if (dist <= radius) {
            let sat = dist / radius, angle = Math.atan2(dy, dx), hue = (angle * 180 / Math.PI + 360) % 360;
            setActiveColor(hslToHex(hue, sat, 0.5));
        }
    }

    // ---------- SET ACTIVE COLOR ----------
    function setActiveColor(hex) {
        activeColorHex = hex.toUpperCase();
        document.getElementById('activeColorPreview').style.backgroundColor = activeColorHex;
        document.getElementById('activeHexValue').innerText = activeColorHex;
        document.getElementById('colorPickerInput').value = activeColorHex;
        drawWheelWithMarker();
        updateTextColorPreview();
        updateMatchingSection();
        updateAIPanel(activeColorHex);
    }

    function updateTextColorPreview() {
        const textColor = getContrastTextColor(activeColorHex);
        document.getElementById('suggestedTextColor').innerText = textColor;
        const sampleSpan = document.getElementById('sampleTextBadge');
        sampleSpan.style.backgroundColor = activeColorHex;
        sampleSpan.style.color = textColor;
        sampleSpan.innerText = "Aa";
    }

    function updateMatchingSection() {
        let [h, s, l] = hexToHsl(activeColorHex);
        let matches = [
            { name: "Comp", hex: hslToHex((h + 180) % 360, s, l) },
            { name: "+30", hex: hslToHex((h + 30) % 360, s, l) },
            { name: "-30", hex: hslToHex((h - 30 + 360) % 360, s, l) },
            { name: "120°", hex: hslToHex((h + 120) % 360, s, l) },
            { name: "240°", hex: hslToHex((h + 240) % 360, s, l) },
            { name: "150°", hex: hslToHex((h + 150) % 360, s, l) }
        ];
        const container = document.getElementById('matchingGrid');
        container.innerHTML = '';
        matches.forEach(m => {
            let div = document.createElement('div');
            div.className = 'match-item';
            let contrastText = getContrastTextColor(m.hex);
            div.innerHTML = `<div class="match-swatch" style="background:${m.hex}; color:${contrastText};">${m.name}</div><div class="match-hex">${m.hex}</div>`;
            div.querySelector('.match-swatch').addEventListener('click', () => setActiveColor(m.hex));
            container.appendChild(div);
        });
    }

    // ---------- AI PANEL ----------
    function updateAIPanel(hex) {
        const panel = document.getElementById('aiContent');
        const data = findColorData(hex);
        if (!data) {
            panel.innerHTML = `<div style="text-align:center;padding:0.4rem 0;color:var(--text-secondary);font-size:0.8rem;"><i class="fas fa-search" style="margin-right:0.4rem;"></i> No detailed data for ${hex}</div>`;
            return;
        }
        const cult = data.cultural_associations || {};
        const industries = data.industry_usage || [];
        const tags = [
            data.category,
            data.color_wheel_position,
            ...(data.positive ? data.positive.split(',').slice(0, 3) : []),
            ...(data.negative ? data.negative.split(',').slice(0, 2) : [])
        ].filter(Boolean).map(s => s.trim());

        panel.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.5rem;">
          <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;">
            <span style="font-weight:700;font-size:1.1rem;color:var(--text-primary);">${data.name}</span>
            <span style="background:var(--chip-bg);padding:0.1rem 0.6rem;border-radius:12px;font-size:0.65rem;color:var(--btn-primary);">${data.category}</span>
            <span style="background:var(--chip-bg);padding:0.1rem 0.6rem;border-radius:12px;font-size:0.65rem;color:var(--btn-primary);">${data.color_wheel_position}</span>
          </div>
          <div><strong>Meaning:</strong> ${data.meaning}</div>
          <div><strong>Psychology:</strong> ${data.psychology}</div>
          <div class="ai-row">
            <div class="ai-stat"><div class="num">${data.emotional_impact}/10</div><div class="label">Emotional Impact</div></div>
            <div class="ai-stat"><div class="num">${data.attention_grabbing}/10</div><div class="label">Attention</div></div>
            <div class="ai-stat"><div class="num">${data.calming_effect}/10</div><div class="label">Calming</div></div>
          </div>
          <div><strong>✨ Positive:</strong> ${data.positive}</div>
          <div><strong>⚠️ Negative:</strong> ${data.negative}</div>
          ${industries.length ? `<div><strong>🏭 Industry Usage:</strong> ${industries.join(' · ')}</div>` : ''}
          <div class="cultural-row">
            ${cult.western ? `<div class="cult-item"><span class="cult-label">🌎 Western:</span> <span class="cult-value">${cult.western}</span></div>` : ''}
            ${cult.eastern ? `<div class="cult-item"><span class="cult-label">🌏 Eastern:</span> <span class="cult-value">${cult.eastern}</span></div>` : ''}
            ${cult.african ? `<div class="cult-item"><span class="cult-label">🌍 African:</span> <span class="cult-value">${cult.african}</span></div>` : ''}
            ${cult.indian ? `<div class="cult-item"><span class="cult-label">🇮🇳 Indian:</span> <span class="cult-value">${cult.indian}</span></div>` : ''}
          </div>
          <div class="ai-tags">${tags.slice(0,8).map(t => `<span>${t}</span>`).join('')}</div>
        </div>`;
    }

    // ---------- PROMPT PALETTE ----------
    function generatePaletteFromPrompt(promptText) {
        if (!promptText.trim()) promptText = "abstract harmony";
        let hash = 0;
        for (let i = 0; i < promptText.length; i++) hash = ((hash << 5) - hash) + promptText.charCodeAt(i), hash |= 0;
        let baseHue = Math.abs(hash % 360);
        let hues = [baseHue, (baseHue + 35) % 360, (baseHue + 75) % 360, (baseHue + 140) % 360, (baseHue + 210) % 360];
        let sats = [0.7, 0.65, 0.72, 0.68, 0.74], lights = [0.62, 0.58, 0.65, 0.6, 0.55];
        let palette = [];
        for (let i = 0; i < 5; i++) palette.push(hslToHex(hues[i], sats[i], lights[i]));
        return palette;
    }

    function renderPromptPalette(palette) {
        const container = document.getElementById('paletteContainer');
        container.innerHTML = '';
        palette.forEach(hex => {
            let div = document.createElement('div');
            div.className = 'swatch-card';
            div.innerHTML = `<div class="swatch" style="background:${hex};"></div><div class="swatch-hex">${hex.toUpperCase()}</div>`;
            div.addEventListener('click', () => setActiveColor(hex));
            container.appendChild(div);
        });
    }

    // ---------- CUSTOM PALETTE BUILDER ----------
    let customColors = [];

    function renderCustomPalette() {
        const container = document.getElementById('customPaletteContainer');
        container.innerHTML = '';
        if (customColors.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-secondary);">✨ Add colors to build your palette</div>';
            return;
        }
        customColors.forEach((hex, idx) => {
            let div = document.createElement('div');
            div.className = 'swatch-card';
            div.innerHTML = `
              <div class="swatch" style="background:${hex};"></div>
              <div class="swatch-hex">${hex.toUpperCase()}</div>
              <div class="remove-swatch" data-idx="${idx}"><i class="fas fa-times-circle"></i> remove</div>`;
            div.querySelector('.swatch').addEventListener('click', () => setActiveColor(hex));
            div.querySelector('.remove-swatch').addEventListener('click', (e) => {
                e.stopPropagation();
                customColors.splice(idx, 1);
                renderCustomPalette();
            });
            container.appendChild(div);
        });
    }

    function addCustomColor(hex) {
        if (!hex) return;
        customColors.push(hex.toUpperCase());
        renderCustomPalette();
    }

    // ---------- LOCAL STORAGE: PALETTES ----------
    let savedPalettes = JSON.parse(localStorage.getItem('helaberry_custom_palettes') || '[]');

    function updateSavedPalettesDropdown() {
        const select = document.getElementById('savedPalettesSelect');
        select.innerHTML = '<option value="">-- Select a palette --</option>';
        savedPalettes.forEach((p, idx) => {
            let opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${p.name} (${p.colors.length} colors)`;
            select.appendChild(opt);
        });
    }

    function saveCurrentPalette() {
        if (customColors.length === 0) { alert("Add at least one color first."); return; }
        let name = prompt("Palette name:", `Palette ${savedPalettes.length + 1}`);
        if (!name) return;
        savedPalettes.push({ name, colors: [...customColors] });
        localStorage.setItem('helaberry_custom_palettes', JSON.stringify(savedPalettes));
        updateSavedPalettesDropdown();
        alert(`Palette "${name}" saved.`);
    }

    function loadSelectedPalette() {
        const idx = document.getElementById('savedPalettesSelect').value;
        if (idx === '' || !savedPalettes[idx]) return;
        customColors = [...savedPalettes[idx].colors];
        renderCustomPalette();
    }

    function deleteSelectedPalette() {
        const idx = document.getElementById('savedPalettesSelect').value;
        if (idx === '' || !savedPalettes[idx]) return;
        if (confirm(`Delete "${savedPalettes[idx].name}"?`)) {
            savedPalettes.splice(idx, 1);
            localStorage.setItem('helaberry_custom_palettes', JSON.stringify(savedPalettes));
            updateSavedPalettesDropdown();
            document.getElementById('savedPalettesSelect').value = '';
        }
    }

    function copyCustomPalette() {
        if (customColors.length === 0) return alert("No colors in palette.");
        let hexStr = customColors.join(', ');
        navigator.clipboard.writeText(hexStr).catch(() => {});
        alert("Copied: " + hexStr);
    }

    function clearCustomPalette() {
        if (customColors.length && confirm("Clear all colors?")) customColors = [];
        renderCustomPalette();
    }

    // ---------- GRADIENT ----------
    let savedGradients = JSON.parse(localStorage.getItem('helaberry_gradients') || '[]');
    let currentDirection = "to right";
    const gradA = document.getElementById('gradColorA');
    const gradB = document.getElementById('gradColorB');
    const gradPreview = document.getElementById('gradientPreview');
    const cssCodeSpan = document.getElementById('cssGradientCode');

    function updateGradientUI() {
        const gradString = `linear-gradient(${currentDirection}, ${gradA.value}, ${gradB.value})`;
        gradPreview.style.background = gradString;
        cssCodeSpan.innerHTML = `<code>background: ${gradString};</code><button id="copyGradientBtn" class="copy-btn"><i class="far fa-copy"></i> Copy</button>`;
        document.getElementById('copyGradientBtn')?.addEventListener('click', () => {
            navigator.clipboard.writeText(`background: ${gradString};`).catch(() => {});
            alert("Gradient CSS copied!");
        });
    }

    function setDirection(dir) {
        currentDirection = dir;
        document.querySelectorAll('.dir-btn').forEach(btn => {
            if (btn.getAttribute('data-dir') === dir) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        updateGradientUI();
    }

    function saveCurrentGradient() {
        let name = prompt("Name this gradient:", `Gradient ${savedGradients.length + 1}`);
        if (!name) return;
        savedGradients.push({ name, colorA: gradA.value, colorB: gradB.value, direction: currentDirection });
        localStorage.setItem('helaberry_gradients', JSON.stringify(savedGradients));
        renderSavedGradientsList();
    }

    function renderSavedGradientsList() {
        const container = document.getElementById('savedGradientsList');
        container.innerHTML = '<div style="font-size:0.7rem;font-weight:500;color:var(--text-secondary);">📁 Saved Gradients</div>';
        if (savedGradients.length === 0) {
            container.innerHTML += '<div style="font-size:0.7rem;color:var(--text-secondary);margin-top:0.3rem;">No saved gradients yet</div>';
            return;
        }
        savedGradients.forEach((g, idx) => {
            let div = document.createElement('div');
            div.className = 'saved-item';
            div.innerHTML = `
              <span style="cursor:pointer;flex:1;" title="Load">${g.name}</span>
              <div>
                <button class="icon-btn load-grad" data-idx="${idx}"><i class="fas fa-download"></i></button>
                <button class="icon-btn delete-grad" data-idx="${idx}"><i class="fas fa-trash-alt"></i></button>
              </div>`;
            div.querySelector('.load-grad')?.addEventListener('click', () => {
                gradA.value = g.colorA;
                gradB.value = g.colorB;
                setDirection(g.direction);
                updateGradientUI();
            });
            div.querySelector('.delete-grad')?.addEventListener('click', () => {
                savedGradients.splice(idx, 1);
                localStorage.setItem('helaberry_gradients', JSON.stringify(savedGradients));
                renderSavedGradientsList();
            });
            container.appendChild(div);
        });
    }

    function clearGradientReset() {
        gradA.value = "#3b82f6";
        gradB.value = "#f97316";
        setDirection("to right");
        updateGradientUI();
    }

    function useActiveAsStart() {
        gradA.value = activeColorHex;
        updateGradientUI();
    }

    // ---------- AI SEARCH ----------
    function performAISearch(query, filter) {
        const results = document.getElementById('aiSearchResults');
        if (!query.trim() && filter === 'all') {
            results.innerHTML = '<div class="no-results"><i class="fas fa-search" style="margin-right:0.4rem;"></i>Search for colors by name, hex, meaning, industry, or mood</div>';
            return;
        }
        const q = query.trim().toLowerCase();
        let filtered = COLOR_DATA.filter(c => {
            if (filter !== 'all' && c.category !== filter) return false;
            if (!q) return true;
            const searchStr = `${c.name} ${c.hex} ${c.meaning} ${c.psychology} ${c.positive} ${c.negative} ${c.category} ${c.color_wheel_position} ${(c.industry_usage||[]).join(' ')}`.toLowerCase();
            return searchStr.includes(q);
        });
        if (filtered.length === 0) {
            results.innerHTML = `<div class="no-results"><i class="fas fa-exclamation-circle" style="margin-right:0.4rem;"></i>No colors found for "${query}"</div>`;
            return;
        }
        results.innerHTML = '';
        filtered.slice(0, 12).forEach(c => {
            let div = document.createElement('div');
            div.className = 'result-item';
            const contrast = getContrastTextColor(c.hex);
            div.innerHTML = `
              <div class="r-swatch" style="background:${c.hex};border-color:${contrast};"></div>
              <div class="r-info"><span class="r-name">${c.name}</span> <span class="r-meta">${c.category} · ${c.color_wheel_position}</span></div>
              <div class="r-hex">${c.hex}</div>`;
            div.addEventListener('click', () => setActiveColor(c.hex));
            results.appendChild(div);
        });
        if (filtered.length > 12) {
            let more = document.createElement('div');
            more.className = 'no-results';
            more.style.fontSize = '0.7rem';
            more.textContent = `+ ${filtered.length - 12} more results`;
            results.appendChild(more);
        }
    }

    // ---------- THEME ----------
    function initThemeToggle() {
        const toggle = document.getElementById('darkModeToggle');
        const isLight = localStorage.getItem('helaberry_light') === 'true';
        if (isLight) {
            document.body.classList.add('light');
            toggle.innerHTML = '<span class="toggle-icon"></span><span>Dark</span>';
        } else {
            document.body.classList.remove('light');
            toggle.innerHTML = '<span class="toggle-icon"></span><span>Light</span>';
        }
        toggle.addEventListener('click', () => {
            const nowLight = document.body.classList.toggle('light');
            localStorage.setItem('helaberry_light', nowLight);
            toggle.innerHTML = nowLight ? '<span class="toggle-icon"></span><span>Dark</span>' : '<span class="toggle-icon"></span><span>Light</span>';
            drawWheelWithMarker();
        });
    }

    // ---------- LOGO FALLBACK ----------
    function initLogoFallback() {
        document.querySelectorAll('img.brand-logo, img.toggle-logo, img.chat-brand-logo').forEach(img => {
            img.addEventListener('error', function() {
                const fallbackClass = this.dataset.fallback || 'fas fa-leaf';
                const icon = document.createElement('i');
                icon.className = fallbackClass;
                if (this.classList.contains('brand-logo')) icon.classList.add('brand-logo-fallback');
                else if (this.classList.contains('toggle-logo')) icon.classList.add('toggle-logo-fallback');
                else if (this.classList.contains('chat-brand-logo')) icon.classList.add('chat-brand-logo-fallback');
                if (this.parentNode) this.parentNode.replaceChild(icon, this);
            });
        });
    }

    // ============================================================
    //  CHATBOT
    // ============================================================
    const chatToggle = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    const chatClose = document.getElementById('chatClose');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const quickSuggestions = document.getElementById('quickSuggestions');

    let isChatOpen = false;
    let isTyping = false;

    function toggleChat() {
        isChatOpen = !isChatOpen;
        chatWindow.classList.toggle('open', isChatOpen);
        if (isChatOpen) {
            chatInput.focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function closeChat() {
        isChatOpen = false;
        chatWindow.classList.remove('open');
    }

    function addMessage(text, sender, options = {}) {
        const div = document.createElement('div');
        div.className = `msg ${sender}`;
        div.innerHTML = text;
        if (options.suggestions && options.suggestions.length) {
            const chipWrap = document.createElement('div');
            chipWrap.className = 'suggested-chips';
            options.suggestions.forEach(s => {
                const chip = document.createElement('span');
                chip.className = 'chip';
                chip.textContent = s;
                chip.addEventListener('click', () => {
                    chatInput.value = s;
                    handleUserMessage(s);
                });
                chipWrap.appendChild(chip);
            });
            div.appendChild(chipWrap);
        }
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping() {
        if (isTyping) return;
        isTyping = true;
        const div = document.createElement('div');
        div.className = 'typing-indicator';
        div.id = 'typingIndicator';
        div.innerHTML = '<span></span><span></span><span></span> AI thinking…';
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTyping() {
        isTyping = false;
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    function getColorSuggestion(query) {
        const q = query.toLowerCase().trim();
        const direct = COLOR_DATA.find(c => c.name.toLowerCase() === q || c.hex.toLowerCase() === q);
        if (direct) {
            const cult = direct.cultural_associations || {};
            const industries = direct.industry_usage || [];
            return `
              <strong>🎨 ${direct.name}</strong> (${direct.hex})<br/>
              <strong>Meaning:</strong> ${direct.meaning}<br/>
              <strong>Psychology:</strong> ${direct.psychology}<br/>
              <strong>✨ Positive:</strong> ${direct.positive}<br/>
              <strong>⚠️ Negative:</strong> ${direct.negative}<br/>
              ${industries.length ? `<strong>🏭 Used in:</strong> ${industries.join(' · ')}<br/>` : ''}
              <strong>Emotional Impact:</strong> ${direct.emotional_impact}/10 · Attention: ${direct.attention_grabbing}/10 · Calming: ${direct.calming_effect}/10`;
        }
        const keywords = q.split(/\s+/);
        let results = [];
        for (const c of COLOR_DATA) {
            const searchStr = `${c.meaning} ${c.psychology} ${c.positive} ${c.negative} ${c.category} ${c.color_wheel_position} ${(c.industry_usage||[]).join(' ')}`.toLowerCase();
            let score = 0;
            for (const kw of keywords) {
                if (searchStr.includes(kw)) score += 2;
                if (c.name.toLowerCase().includes(kw)) score += 3;
                if (c.hex.toLowerCase().includes(kw)) score += 5;
            }
            if (score > 0) results.push({ ...c, score });
        }
        results.sort((a, b) => b.score - a.score);

        if (results.length === 0) {
            return `🤔 I couldn't find anything for "${query}". Try asking about a color name, mood like "calm", or industry like "technology".`;
        }
        if (results.length === 1) {
            const c = results[0];
            const industries = c.industry_usage || [];
            return `
              <strong>🎨 ${c.name}</strong> (${c.hex}) — best match<br/>
              <strong>Meaning:</strong> ${c.meaning}<br/>
              <strong>Psychology:</strong> ${c.psychology}<br/>
              <strong>✨ Positive:</strong> ${c.positive}<br/>
              ${industries.length ? `<strong>🏭 Used in:</strong> ${industries.join(' · ')}<br/>` : ''}
              <strong>Emotional Impact:</strong> ${c.emotional_impact}/10 · Attention: ${c.attention_grabbing}/10 · Calming: ${c.calming_effect}/10`;
        }
        let top = results.slice(0, 4);
        let html = `🔍 <strong>Found ${results.length} matches for "${query}":</strong><br/><br/>`;
        top.forEach((c, i) => {
            html += `${i+1}. <strong>${c.name}</strong> ${c.hex} — ${c.category} · ${c.color_wheel_position}<br/>`;
        });
        if (results.length > 4) html += `<br/>And ${results.length - 4} more…`;
        html += `<br/><br/>💡 Try clicking a color in the search results above!`;
        return html;
    }

    function handleUserMessage(text) {
        if (!text.trim()) return;
        addMessage(text, 'user');
        chatInput.value = '';
        showTyping();
        setTimeout(() => {
            hideTyping();
            const response = getColorSuggestion(text);
            const colorNames = COLOR_DATA.filter(c => response.includes(c.name)).slice(0, 3);
            const suggestions = colorNames.map(c => `Tell me about ${c.name}`);
            if (suggestions.length < 2) {
                suggestions.push('What colors are calming?', 'Find colors for luxury', 'Give me a warm palette');
            }
            const uniqueSuggestions = [...new Set(suggestions)].slice(0, 4);
            addMessage(response, 'ai', { suggestions: uniqueSuggestions });
        }, 300 + Math.random() * 400);
    }

    chatToggle.addEventListener('click', toggleChat);
    chatClose.addEventListener('click', closeChat);
    chatSend.addEventListener('click', () => handleUserMessage(chatInput.value));
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleUserMessage(chatInput.value); }
    });
    quickSuggestions.querySelectorAll('.qs-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.getAttribute('data-query');
            if (query) {
                handleUserMessage(query);
                if (!isChatOpen) toggleChat();
            }
        });
    });
    chatMessages.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (chip) {
            const query = chip.textContent;
            if (query) handleUserMessage(query);
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isChatOpen) closeChat();
    });

    // ============================================================
    //  INIT
    // ============================================================
    function init() {
        initThemeToggle();
        initLogoFallback();
        wheelImageData = buildWheelImageData();

        setActiveColor("#3b82f6");
        renderPromptPalette(generatePaletteFromPrompt("professional dawn"));

        canvas.addEventListener('click', pickColorFromWheel);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); pickColorFromWheel(e); }, { passive: false });
        document.getElementById('colorPickerInput').addEventListener('input', (e) => setActiveColor(e.target.value));

        document.getElementById('generatePaletteBtn').addEventListener('click', () => {
            let val = document.getElementById('promptInput').value;
            renderPromptPalette(generatePaletteFromPrompt(val));
        });
        document.getElementById('promptInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('generatePaletteBtn').click();
        });

        document.getElementById('addColorBtn').addEventListener('click', () => {
            let picker = document.getElementById('customColorPicker');
            addCustomColor(picker.value);
        });
        document.getElementById('saveCustomPaletteBtn').addEventListener('click', saveCurrentPalette);
        document.getElementById('copyCustomPaletteBtn').addEventListener('click', copyCustomPalette);
        document.getElementById('clearCustomPaletteBtn').addEventListener('click', clearCustomPalette);
        document.getElementById('loadPaletteBtn').addEventListener('click', loadSelectedPalette);
        document.getElementById('deletePaletteBtn').addEventListener('click', deleteSelectedPalette);
        updateSavedPalettesDropdown();
        renderCustomPalette();

        gradA.addEventListener('input', updateGradientUI);
        gradB.addEventListener('input', updateGradientUI);
        document.querySelectorAll('.dir-btn').forEach(btn => {
            btn.addEventListener('click', () => setDirection(btn.getAttribute('data-dir')));
        });
        document.getElementById('saveGradientBtn').addEventListener('click', saveCurrentGradient);
        document.getElementById('clearGradientBtn').addEventListener('click', clearGradientReset);
        document.getElementById('useActiveGradientBtn').addEventListener('click', useActiveAsStart);
        renderSavedGradientsList();
        updateGradientUI();

        document.getElementById('aiSearchBtn').addEventListener('click', () => {
            const q = document.getElementById('aiSearchInput').value;
            const f = document.getElementById('aiSearchFilter').value;
            performAISearch(q, f);
        });
        document.getElementById('aiSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('aiSearchBtn').click();
        });
        document.getElementById('aiSearchFilter').addEventListener('change', () => {
            const q = document.getElementById('aiSearchInput').value;
            const f = document.getElementById('aiSearchFilter').value;
            performAISearch(q, f);
        });
        performAISearch('', 'all');

        document.getElementById('brandLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();