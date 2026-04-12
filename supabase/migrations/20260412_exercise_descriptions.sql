-- Fill missing exercise descriptions (French, 1-2 sentences)
-- Only updates rows where description IS NULL or empty

-- POITRINE
UPDATE exercises_db SET description = 'Allongé sur un banc plat, poussez la barre vers le haut en gardant les pieds au sol. Descente contrôlée jusqu''à la poitrine, remontée explosive.' WHERE name = 'Développé couché barre' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Allongé sur un banc plat, poussez les haltères vers le haut. L''amplitude est plus grande qu''à la barre, excellent pour l''étirement des pectoraux.' WHERE name = 'Développé couché haltères' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Sur banc incliné à 30-45°, poussez la barre vers le haut. Cible le haut des pectoraux et les deltoïdes antérieurs.' WHERE name = 'Développé incliné barre' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Sur banc incliné à 30-45°, poussez les haltères vers le haut. Permet une meilleure contraction du haut des pectoraux.' WHERE name = 'Développé incliné haltères' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Sur banc décliné, poussez la barre vers le haut. Cible le bas des pectoraux.' WHERE name = 'Développé décliné barre' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Bras tendus, ouvrez les haltères en arc de cercle puis rapprochez-les au-dessus de la poitrine. Isolation des pectoraux.' WHERE name = 'Écarté couché haltères' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Debout entre deux poulies hautes, tirez les poignées vers le bas et l''intérieur. Excellent pour la contraction des pectoraux.' WHERE name = 'Écarté poulie vis-à-vis' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'En appui sur les barres parallèles, descendez en fléchissant les coudes puis remontez. Travaille pectoraux et triceps.' WHERE name = 'Dips' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Allongé, descendez un haltère derrière la tête bras semi-fléchis. Étire les pectoraux et le grand dorsal.' WHERE name = 'Pull-over haltère' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis à la machine, rapprochez les bras devant vous. Isolation des pectoraux sans charge libre.' WHERE name = 'Pec deck' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Prise serrée sur la barre, poussez en gardant les coudes proches du corps. Cible les triceps et l''intérieur des pectoraux.' WHERE name = 'Développé couché prise serrée' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Poussez-vous du sol, corps gainé de la tête aux pieds. Exercice de base pour les pectoraux au poids du corps.' WHERE name = 'Pompes' AND (description IS NULL OR description = '');

-- DOS
UPDATE exercises_db SET description = 'Suspendez-vous à une barre et tirez votre corps vers le haut. L''exercice roi pour le dos, les biceps et la force fonctionnelle.' WHERE name = 'Tractions' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis, tirez la barre vers la poitrine en serrant les omoplates. Développe la largeur du dos.' WHERE name = 'Tirage vertical poulie haute' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis, tirez la poignée vers le ventre en gardant le dos droit. Développe l''épaisseur du dos.' WHERE name = 'Tirage horizontal câble' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Penché à 45°, tirez la barre vers le ventre en serrant les omoplates. Mouvement de base pour l''épaisseur du dos.' WHERE name = 'Rowing barre' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Un genou et une main sur le banc, tirez l''haltère vers la hanche. Excellent pour isoler chaque côté du dos.' WHERE name = 'Rowing haltère' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Pieds écartés, soulevez la barre du sol en gardant le dos droit. Mouvement fondamental pour la chaîne postérieure.' WHERE name = 'Soulevé de terre' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Jambes quasi-tendues, descendez la barre le long des cuisses puis remontez. Cible les ischio-jambiers et le bas du dos.' WHERE name = 'Soulevé de terre roumain' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Barre sur les épaules, inclinez le buste vers l''avant puis redressez-vous. Renforce le bas du dos et les ischio-jambiers.' WHERE name = 'Good morning' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Debout, haussez les épaules vers les oreilles en tenant la barre. Développe les trapèzes supérieurs.' WHERE name = 'Shrugs' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'À la poulie haute avec corde, tirez vers le visage en écartant les mains. Renforce les deltoïdes postérieurs et la coiffe des rotateurs.' WHERE name = 'Face pulls' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Bras tendus, tirez la barre vers les cuisses en gardant les bras droits. Isolation du grand dorsal.' WHERE name = 'Pullover poulie' AND (description IS NULL OR description = '');

-- ÉPAULES
UPDATE exercises_db SET description = 'Debout, poussez la barre au-dessus de la tête en gardant le tronc gainé. Mouvement de base pour les épaules.' WHERE name = 'Développé militaire barre' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis ou debout, poussez les haltères au-dessus de la tête. Permet une trajectoire plus naturelle que la barre.' WHERE name = 'Développé militaire haltères' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Commencez paumes vers vous, poussez en tournant les poignets vers l''extérieur. Combine rotation et poussée pour les deltoïdes.' WHERE name = 'Développé Arnold' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Debout, bras le long du corps, montez les haltères sur les côtés jusqu''à l''horizontale. Isole le deltoïde latéral.' WHERE name = 'Élévations latérales haltères' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Debout, montez les haltères devant vous jusqu''à l''horizontale. Cible le deltoïde antérieur.' WHERE name = 'Élévations frontales' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Penché en avant, montez les haltères sur les côtés. Cible le deltoïde postérieur, souvent négligé.' WHERE name = 'Oiseau haltères' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Debout, tirez la barre le long du corps jusqu''au menton. Travaille les trapèzes et les deltoïdes latéraux.' WHERE name = 'Upright row' AND (description IS NULL OR description = '');

-- BICEPS
UPDATE exercises_db SET description = 'Debout, fléchissez les bras en gardant les coudes fixes contre le corps. Mouvement de base pour les biceps.' WHERE name = 'Curl barre droite' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Comme le curl barre droite mais avec une barre EZ. La prise coudée réduit le stress sur les poignets.' WHERE name = 'Curl barre EZ' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Debout, fléchissez un bras puis l''autre en alternance. Permet de se concentrer sur chaque biceps.' WHERE name = 'Curl haltères alternés' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Prise neutre (pouces vers le haut), fléchissez les bras. Cible le brachial et le brachio-radial en plus du biceps.' WHERE name = 'Curl marteau' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Bras appuyé sur le pupitre, fléchissez le bras. Élimine la triche et isole parfaitement le biceps.' WHERE name = 'Curl pupitre' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis, coude appuyé sur la cuisse intérieure, fléchissez le bras. Isolation maximale du biceps.' WHERE name = 'Curl concentré' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Sur banc incliné à 45°, fléchissez les bras. La position étire le biceps au maximum en bas du mouvement.' WHERE name = 'Curl incliné haltères' AND (description IS NULL OR description = '');

-- TRICEPS
UPDATE exercises_db SET description = 'À la poulie haute, poussez la barre vers le bas en gardant les coudes fixes. Isolation des triceps.' WHERE name = 'Extensions triceps poulie' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Avec une corde à la poulie haute, poussez vers le bas en écartant les extrémités. Meilleure contraction des triceps.' WHERE name = 'Extensions triceps corde' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Allongé, descendez la barre vers le front puis remontez. Excellent pour la longue portion du triceps.' WHERE name = 'Skull crushers' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Mains sur un banc derrière vous, descendez le corps puis remontez. Travaille les triceps au poids du corps.' WHERE name = 'Dips triceps' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Penché, tendez le bras vers l''arrière. Isolation de la portion latérale du triceps.' WHERE name = 'Kickback haltère' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Debout, tenez un haltère ou une corde derrière la tête puis tendez les bras vers le haut. Étire et travaille la longue portion.' WHERE name = 'Extension overhead corde' AND (description IS NULL OR description = '');

-- QUADRICEPS
UPDATE exercises_db SET description = 'Barre sur les trapèzes, descendez en fléchissant hanches et genoux. Le roi des exercices pour les jambes.' WHERE name = 'Squat barre' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Barre sur les deltoïdes antérieurs, descendez en gardant le buste très droit. Cible davantage les quadriceps.' WHERE name = 'Front squat' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis à la machine, poussez la plateforme avec les pieds. Mouvement guidé pour les quadriceps et fessiers.' WHERE name = 'Presse à cuisses' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Debout dans la machine, descendez en gardant le dos contre le support. Cible les quadriceps de manière isolée.' WHERE name = 'Hack squat' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Faites un grand pas en avant et descendez jusqu''à ce que les deux genoux soient à 90°. Travaille quadriceps et fessiers.' WHERE name = 'Fentes' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Pied arrière sur un banc, descendez en fente. Excellent pour l''équilibre, les quadriceps et les fessiers.' WHERE name = 'Fentes bulgares' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis à la machine, tendez les jambes vers l''avant. Isolation pure des quadriceps.' WHERE name = 'Leg extension' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Tenez un haltère contre la poitrine et descendez en squat. Idéal pour les débutants et l''activation des fessiers.' WHERE name = 'Goblet squat' AND (description IS NULL OR description = '');

-- ISCHIO-JAMBIERS
UPDATE exercises_db SET description = 'Allongé face contre le banc, fléchissez les jambes vers les fessiers. Isolation des ischio-jambiers.' WHERE name = 'Leg curl couché machine' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis à la machine, fléchissez les jambes sous le siège. Travaille les ischio-jambiers en position assise.' WHERE name = 'Leg curl assis machine' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Jambes tendues, descendez la barre le long des cuisses. Étire et renforce les ischio-jambiers et les fessiers.' WHERE name = 'Soulevé de terre jambes tendues' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Dos contre un banc, poussez les hanches vers le haut avec une barre sur les cuisses. Le meilleur exercice pour les fessiers.' WHERE name = 'Hip thrust barre' AND (description IS NULL OR description = '');

-- FESSIERS
UPDATE exercises_db SET description = 'À la poulie basse, tirez la jambe vers l''arrière. Isole les fessiers avec une tension constante.' WHERE name = 'Kickback poulie' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assise à la machine, écartez les cuisses contre la résistance. Cible le moyen fessier et les abducteurs.' WHERE name = 'Abducteurs machine' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assise à la machine, rapprochez les cuisses contre la résistance. Renforce les adducteurs.' WHERE name = 'Adducteurs machine' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Allongé au sol, pieds au sol, poussez les hanches vers le haut. Version sans charge du hip thrust.' WHERE name = 'Pont fessier' AND (description IS NULL OR description = '');

-- MOLLETS
UPDATE exercises_db SET description = 'Debout, montez sur la pointe des pieds puis redescendez. Cible le gastrocnémien (jumeaux).' WHERE name = 'Mollets debout' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis, montez sur la pointe des pieds contre la résistance. Cible le soléaire, sous le gastrocnémien.' WHERE name = 'Mollets assis' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'À la presse à cuisses, poussez la plateforme avec la pointe des pieds. Charge lourde possible pour les mollets.' WHERE name = 'Mollets à la presse' AND (description IS NULL OR description = '');

-- ABDOS
UPDATE exercises_db SET description = 'Allongé, genoux fléchis, enroulez le buste vers les genoux. Exercice de base pour les abdominaux.' WHERE name = 'Crunch' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'À genoux face à la poulie haute, enroulez le buste vers le sol. Permet d''ajouter de la résistance au crunch.' WHERE name = 'Crunch câble' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Comme un crunch mais en tournant le buste vers le côté opposé. Cible les obliques.' WHERE name = 'Crunch oblique' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'En appui sur les avant-bras et les pieds, maintenez le corps aligné. Renforce toute la sangle abdominale.' WHERE name = 'Planche' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Suspendu à une barre, montez les jambes tendues devant vous. Excellent pour le bas des abdominaux.' WHERE name = 'Relevé de jambes suspendu' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'À genoux, roulez la roue vers l''avant puis revenez. Travaille toute la chaîne abdominale en profondeur.' WHERE name = 'Ab roller' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Assis, pieds décollés, tournez le buste de gauche à droite. Renforce les obliques et la taille.' WHERE name = 'Russian twist' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'En position de pompe, ramenez les genoux alternativement vers la poitrine. Combine cardio et travail abdominal.' WHERE name = 'Mountain climbers' AND (description IS NULL OR description = '');

-- CARDIO
UPDATE exercises_db SET description = 'Enchaînez squat, planche, pompe et saut vertical. Exercice complet à haute intensité pour le cardio et la force.' WHERE name = 'Burpees' AND (description IS NULL OR description = '');
UPDATE exercises_db SET description = 'Sautez en écartant les bras et les jambes simultanément. Exercice cardio simple et efficace pour l''échauffement.' WHERE name = 'Jumping jacks' AND (description IS NULL OR description = '');
