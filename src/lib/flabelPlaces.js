/*
 * Silhouettes de ville et drapeaux du bandeau de route — repris TEL QUEL du
 * prototype approuve (annexe A4, 03_OUTILS/lvp_build/flabel_places.js).
 *
 * Le fichier est du dessin vectoriel : aucune dependance, aucun appel reseau.
 * On ne le reecrit pas, on le branche : l IIFE ecrivait sur window.TNPFL, elle
 * ecrit maintenant dans un objet local que ce module reexporte. Retoucher les
 * traces reviendrait a redessiner des monuments a la main et a s eloigner de la
 * maquette a chaque correction.
 */

// Le point-virgule est obligatoire : la ligne suivante ouvre une IIFE, et
// sans lui JavaScript lit `{}(...)` comme un appel de fonction.
const registry = {};
/* ============================================================================
   NetPlus AOC — FLIGHT LABEL · PLACES & FLAGS
   Identité visuelle authentique des terrains du bandeau de route : silhouettes dessinées
   (repères réels de la ville + tour de contrôle et aérogare, comme la maquette) et drapeaux
   nationaux vectoriels. Tout est embarqué : aucun appel réseau, aucune image générique.
   Un terrain sans repère curaté n'affiche que la tour de contrôle et l'aérogare — jamais un
   monument d'une autre ville.
   Repère : boîte 0 0 <w> 100, ligne de sol y=100 ; rendu ancré en bas, teinte bleu-gris.
============================================================================ */
(function(root){
'use strict';
var FL = root.TNPFL = root.TNPFL || {};

/* ---- éléments communs d'aérodrome (présents des deux côtés de la maquette) ---- */
var TOWER = ['M18 100 L19.2 54 H22.8 L24 100 Z','M15.8 54 L14.6 44 H27.4 L26.2 54 Z','M15.4 46.5 H26.6 V51 H15.4 Z','M13.8 44 H28.2 V41 H13.8 Z','M16.4 41 H25.6 V37.6 H16.4 Z','M20.6 37.6 H21.4 V25 H20.6 Z','M18.6 64 H23.4 V68 H18.6 Z','M9 100 V78 H16.4 V100 Z','M10.2 82 H12.4 V88 H10.2 Z','M13.4 82 H15.4 V88 H13.4 Z'];
var TERMINAL = ['M0 100 V46 H205 V100 Z','M-3 46 H208 V39 H-3 Z','M-3 39 H208 V35.5 H-3 Z','M4 68 H10 V100 H4 Z','M16 68 H22 V100 H16 Z','M28 68 H34 V100 H28 Z','M40 68 H46 V100 H40 Z','M52 68 H58 V100 H52 Z','M64 68 H70 V100 H64 Z','M76 68 H82 V100 H76 Z','M88 68 H94 V100 H88 Z','M100 68 H106 V100 H100 Z','M112 68 H118 V100 H112 Z','M124 68 H130 V100 H124 Z','M136 68 H142 V100 H136 Z','M148 68 H154 V100 H148 Z','M160 68 H166 V100 H160 Z','M172 68 H178 V100 H172 Z','M184 68 H190 V100 H184 Z','M196 68 H202 V100 H196 Z','M5 50 H11 V58 H5 Z','M17 50 H23 V58 H17 Z','M29 50 H35 V58 H29 Z','M41 50 H47 V58 H41 Z','M53 50 H59 V58 H53 Z','M65 50 H71 V58 H65 Z','M77 50 H83 V58 H77 Z','M89 50 H95 V58 H89 Z','M101 50 H107 V58 H101 Z','M113 50 H119 V58 H113 Z','M125 50 H131 V58 H125 Z','M137 50 H143 V58 H137 Z','M149 50 H155 V58 H149 Z','M161 50 H167 V58 H161 Z','M173 50 H179 V58 H173 Z','M185 50 H191 V58 H185 Z','M197 50 H203 V58 H197 Z','M46 100 V74 H74 V100 Z','M44 74 H76 V68 H44 Z'];
var SKY = ['M0 100 V88 H7 V82 H5.5 V90 H12 V85 H4.5 V93 H9 V87 H6 V91 H5 V100 Z'];
var SKYLINE = ['M0 100 V89 H6 V100 Z','M7 100 V83 H5 V100 Z','M13 100 V91 H7 V100 Z','M21 100 V86 H4.5 V100 Z','M26 100 V93 H8 V100 Z','M35 100 V88 H6 V100 Z','M42 100 V91 H5 V100 Z','M48 100 V84 H6 V100 Z','M55 100 V92 H7 V100 Z','M63 100 V87 H5 V100 Z','M69 100 V90 H6 V100 Z','M76 100 V85 H5 V100 Z','M82 100 V92 H7 V100 Z','M90 100 V88 H6 V100 Z','M97 100 V91 H5 V100 Z','M103 100 V86 H7 V100 Z','M111 100 V93 H6 V100 Z','M118 100 V89 H6 V100 Z'];

/* ---- repères de ville (dessins originaux, monuments réels) ---- */
var PLACES = {
  /* Paris — tour Eiffel */
  PARIS:{ w:48, s:0.64, k:0.78, label:'Eiffel Tower', haze:['M12.5 100 C17 81 21.5 62 24 49 C26.5 62 31 81 35.5 100 Z'], paths:[
    'M2 100 C11 79 19 61 21.6 45 H26.4 C29 61 37 79 46 100 H37.6 C32.6 81 27.4 62 24 49 C20.6 62 15.4 81 10.4 100 Z',
    'M8 77 H40 V73.4 H8 Z','M14 57 H34 V53.6 H14 Z','M20.8 45 L21.8 25 H26.2 L27.2 45 Z','M19.6 26.6 H28.4 V24 H19.6 Z',
    'M22.2 25 L22.9 13 H25.1 L25.8 25 Z','M23.4 13 V4 H24.6 V13 Z','M22 4.4 H26 V3 H22 Z'] },
  /* Londres — tour Elizabeth (Big Ben) et Westminster */
  LONDON:{ w:34, s:0.56, k:0.68, label:'Elizabeth Tower', paths:[
    'M-4 100 V74 H4 V100 Z','M-2 74 V70 H2 V74 Z','M6.4 100 V31 H20.6 V100 Z','M4.6 31 V23.4 H22.4 V31 Z',
    'M5.6 23.4 L13.5 4.4 L21.4 23.4 Z','M13 4.4 V0.6 H14 V4.4 Z',
    'M13.5 40.5 A5.4 5.4 0 1 1 13.4 40.5 Z','M9 52 H18 V54 H9 Z','M9 60 H18 V62 H9 Z','M9 68 H18 V70 H9 Z',
    'M24 100 V79 H33 V100 Z','M25.4 79 V74 H27 V79 Z','M30 79 V74 H31.6 V79 Z'] },
  /* Tunis — minaret de la mosquée Zitouna et coupoles de la médina */
  TUNIS:{ w:38, s:0.56, k:0.66, label:'Zitouna minaret', paths:[
    'M8.6 100 V35 H22.4 V100 Z','M6.6 35 V28.6 H24.4 V35 Z','M10.6 28.6 V16.6 H20.4 V28.6 Z',
    'M9.4 16.6 L15.5 6.4 L21.6 16.6 Z','M14.9 6.4 V1.6 H16.1 V6.4 Z','M13.9 3.4 H17.1 V4.4 H13.9 Z',
    'M12 44 H19 V56 A3.5 3.5 0 0 0 12 56 Z','M12 66 H19 V78 A3.5 3.5 0 0 0 12 78 Z',
    'M24 100 V84 H36 V100 Z','M24 84 Q30 71 36 84 Z','M29.4 71 V67 H30.6 V71 Z',
    'M0 100 V88 Q4.5 78 9 88 V100 Z'] },
  /* Djerba — coupoles blanches et palmiers */
  DJERBA:{ w:40, s:0.4, k:0.86, label:'Djerba domes', paths:[
    'M2 100 V80 H21 V100 Z','M2 80 Q11.5 64 21 80 Z','M11 64 V60 H12 V64 Z',
    'M22 100 V88 H32 V100 Z','M22 88 Q27 78 32 88 Z',
    'M8 90 H14 V100 H8 Z',
    'M33.4 100 Q34.6 86 36 76 H38 Q37 86 37.6 100 Z',
    'M37 78 C33 72 30 71 28 72 C31 70 35 71 37 76 Z','M37 78 C41 72 44 71 46 72 C43 70 39 71 37 76 Z',
    'M37 76 C35 68 33 65 31 63 C34 64 37 68 37.6 74 Z','M37 76 C39 68 41 65 43 63 C40 64 37.4 68 37 74 Z'] },
  /* Nice — coupole de la Promenade, palmiers et colline du Château */
  NICE:{ w:44, s:0.42, k:0.86, label:'Promenade des Anglais', paths:[
    'M3 100 V75 H27 V100 Z','M9.4 75 Q15 58 20.6 75 Z','M14.5 58 V54 H15.5 V58 Z',
    'M2.4 75 Q5 68 7.6 75 Z','M22.4 75 Q25 68 27.6 75 Z',
    'M6 82 H10 V92 H6 Z','M13 82 H17 V92 H13 Z','M20 82 H24 V92 H20 Z',
    'M27 100 Q35 96 39 78 Q42 92 44 100 Z',
    'M30.4 100 Q31.4 88 32.6 80 H34.2 Q33.4 88 34 100 Z',
    'M33.4 82 C30 77 27.6 76 26 77 C28.6 75 31.8 76 33.4 80 Z','M33.4 82 C36.8 77 39.2 76 40.8 77 C38.2 75 35 76 33.4 80 Z'] },
  /* Marseille — Notre-Dame de la Garde sur sa colline */
  MARSEILLE:{ w:34, s:0.54, k:0.78, label:'Notre-Dame de la Garde', paths:[
    'M0 100 Q9 92 16 66 Q23 92 34 100 Z','M9 70 V52 H23 V70 Z','M8 52 H24 V49 H8 Z',
    'M13 49 V26 H19 V49 Z','M12 26 H20 V23 H12 Z','M15.4 23 V16.4 H16.6 V23 Z',
    'M14.4 16.4 A1.6 1.6 0 1 1 17.6 16.4 A1.6 1.6 0 1 1 14.4 16.4 Z','M14.9 13.6 A1.1 1.1 0 1 1 17.1 13.6 A1.1 1.1 0 1 1 14.9 13.6 Z',
    'M11 56 H14 V64 H11 Z','M18 56 H21 V64 H18 Z'] },
  /* Genève — Jet d'eau et cathédrale Saint-Pierre */
  GENEVA:{ w:40, s:0.6, k:0.66, label:"Jet d'Eau", paths:[
    'M7 100 C8.6 72 10.6 42 12 16 C13.4 42 15.4 72 17 100 Z',
    'M12 16 C10 11 9 7 9.6 3 C10.6 8 11.4 11 12.4 14 Z','M12 16 C14 11 15 7 14.4 3 C13.4 8 12.6 11 11.6 14 Z',
    'M22 100 V60 H34 V100 Z','M22 60 V44 H26.4 V60 Z','M29.6 60 V44 H34 V60 Z',
    'M21.4 44 H27 V41 H21.4 Z','M29 44 H34.6 V41 H29 Z','M27.4 60 V48 H29 V60 Z','M27.2 48 L28.2 38 L29.2 48 Z',
    'M25 68 H31 V80 H25 Z'] },
  /* Palma de Majorque — cathédrale La Seu */
  PALMA:{ w:44, s:0.48, k:0.78, label:'La Seu cathedral', paths:[
    'M4 100 V54 H30 V100 Z','M4 54 L17 42 L30 54 Z','M17 44.6 A5 5 0 1 1 16.9 44.6 Z',
    'M7.4 54 V46 H9.6 V54 Z','M13.4 54 V44 H15.6 V54 Z','M18.4 54 V44 H20.6 V54 Z','M24.4 54 V46 H26.6 V54 Z',
    'M8 47 L8.5 42 L9 47 Z','M14 45 L14.5 39 L15 45 Z','M19 45 L19.5 39 L20 45 Z','M25 47 L25.5 42 L26 47 Z',
    'M30 100 V40 H39 V100 Z','M29.4 40 H39.6 V36.6 H29.4 Z','M31 36.6 V31 H32.4 V36.6 Z','M36.6 36.6 V31 H38 V36.6 Z',
    'M8 66 H13 V80 H8 Z','M21 66 H26 V80 H21 Z'] },
  /* La Valette — coupole, clocher et bastions */
  VALLETTA:{ w:44, s:0.5, k:0.78, label:'Valletta', paths:[
    'M0 100 V84 H15 V100 Z','M0 84 H15 V81 H0 Z','M3 86 H6 V93 H3 Z','M9 86 H12 V93 H9 Z',
    'M13 100 V68 H31 V100 Z','M13 68 Q22 48 31 68 Z','M20.6 50 V44 H23.4 V50 Z','M21.4 44 V39 H22.6 V44 Z',
    'M31 100 V62 H38 V100 Z','M30.4 62 H38.6 V59 H30.4 Z','M31 59 L34.5 47 L38 59 Z','M34 47 V43 H35 V47 Z',
    'M39 100 V78 H44 V100 Z','M17 78 H21 V90 H17 Z','M24 78 H28 V90 H24 Z'] },
  /* Athènes — Parthénon sur l'Acropole */
  ATHENS:{ w:48, s:0.4, k:0.9, label:'Parthenon', paths:[
    'M0 100 V90 Q10 84 24 84 Q38 84 48 90 V100 Z','M4 84 V80 H44 V84 Z',
    'M7 80 V56 H10.4 V80 Z','M12 80 V56 H15.4 V80 Z','M17 80 V56 H20.4 V80 Z','M22 80 V56 H25.4 V80 Z',
    'M27 80 V56 H30.4 V80 Z','M32 80 V56 H35.4 V80 Z','M37 80 V56 H40.4 V80 Z',
    'M4 56 H44 V50 H4 Z','M4 50 L24 38 L44 50 Z'] },
  /* Istanbul — Sainte-Sophie, minarets et tour de Galata */
  ISTANBUL:{ w:56, s:0.5, k:0.78, label:'Hagia Sophia · Galata', paths:[
    'M12 100 V72 H38 V100 Z','M12 72 Q25 48 38 72 Z','M24.2 48 V41 H25.8 V48 Z',
    'M6 100 V80 Q11 70 16 80 V100 Z','M34 100 V80 Q39 70 44 80 V100 Z',
    'M4.4 100 V50 H7.6 V100 Z','M3.4 50 L6 41 L8.6 50 Z','M5.6 41 V37 H6.4 V41 Z',
    'M42.4 100 V50 H45.6 V100 Z','M41.4 50 L44 41 L46.6 50 Z','M43.6 41 V37 H44.4 V41 Z',
    'M47 100 V64 H55 V100 Z','M46 64 H56 V61 H46 Z','M46.6 61 L51 49 L55.4 61 Z','M50.6 49 V44 H51.4 V49 Z',
    'M18 80 H23 V92 H18 Z','M27 80 H32 V92 H27 Z'] },
  /* Dubaï — Burj Khalifa */
  DUBAI:{ w:36, s:0.66, k:0.52, label:'Burj Khalifa', paths:[
    'M9 100 V66 H12.4 V54 H14.6 V42 H16.2 V28 H17.2 V14 L18 3 L18.8 14 H19.8 V28 H20.8 V42 H22.4 V54 H24.6 V66 H28 V100 Z',
    'M2 100 V80 H7 V100 Z','M29 100 V74 H34 V100 Z','M34 100 V86 H36 V100 Z'] },
  /* Djeddah — fontaine du Roi Fahd et mosquée */
  JEDDAH:{ w:42, s:0.6, k:0.62, label:'King Fahd Fountain', paths:[
    'M6 100 C7.4 68 9.4 36 11 12 C12.6 36 14.6 68 16 100 Z',
    'M11 12 C9 8 8.4 5 9 1 C10 6 10.4 9 11.4 11 Z','M11 12 C13 8 13.6 5 13 1 C12 6 11.6 9 10.6 11 Z',
    'M21 100 V78 H35 V100 Z','M21 78 Q28 64 35 78 Z','M27.4 64 V59 H28.6 V64 Z',
    'M36.4 100 V54 H39.6 V100 Z','M35.4 54 Q38 46 40.6 54 Z','M37.6 46 V41 H38.4 V46 Z','M24 84 H28 V94 H24 Z'] },
  /* New York — Liberté, Empire State et Chrysler */
  NEWYORK:{ w:58, s:0.58, k:0.66, label:'New York skyline', paths:[
    'M1 100 V86 H10 V100 Z','M2.6 86 V82 H8.4 V86 Z','M4.4 82 V70 H6.6 V82 Z',
    'M5.4 70 A1.5 1.5 0 1 1 8.4 70 Z','M6.6 74 L9.6 66 L10.8 66.6 L7.8 74.6 Z','M9 66.6 L10.2 62 L11.2 66.6 Z',
    'M13 100 V52 H15.4 V44 H17.6 V34 H19 L19.8 22 L20.6 34 H22 V44 H24.2 V52 H26.6 V100 Z',
    'M30 100 V50 H40 V100 Z','M29 50 Q35 42 41 50 Z','M31.6 44 Q35 38 38.4 44 Z','M33.4 39 Q35 35 36.6 39 Z','M34.6 35 V22 H35.4 V35 Z',
    'M42 100 V78 H48 V100 Z','M49 100 V84 H54 V100 Z','M54 100 V72 H58 V100 Z','M27 100 V88 H30 V100 Z'] },
  /* Doha — Tornado Tower et Musée d'art islamique */
  DOHA:{ w:46, s:0.54, k:0.72, label:'West Bay · MIA', paths:[
    'M14 100 V72 C10 58 10 44 14 30 H23 C27 44 27 58 23 72 V100 Z',
    'M4 100 V54 C4 46 9 42 9 42 C9 42 14 46 14 54 V100 Z',
    'M30 100 V78 H42 V100 Z','M32 78 V70 H40 V78 Z','M34 70 V62 H38 V70 Z','M35.4 62 L36 57 L36.6 62 Z',
    'M42 100 V88 H46 V100 Z'] },
  /* Dakar — Grande Mosquée et baobab */
  DAKAR:{ w:42, s:0.5, k:0.78, label:'Grande Mosquée · baobab', paths:[
    'M7 100 V42 H12 V100 Z','M5.6 42 H13.4 V38.6 H5.6 Z','M6.4 38.6 Q9.5 30 12.6 38.6 Z','M9 30 V25 H10 V30 Z',
    'M14 100 V80 H28 V100 Z','M14 80 Q21 66 28 80 Z','M20.4 66 V61 H21.6 V66 Z','M17 86 H21 V96 H17 Z',
    'M30 100 Q32 84 33 74 H37 Q38 84 40 100 Z',
    'M27 74 C29 66 33 62 35 62 C37 62 41 66 43 74 C40 70 37 68 35 68 C33 68 30 70 27 74 Z'] },
  /* Lagos — Théâtre national et tours de Marina */
  LAGOS:{ w:42, s:0.36, k:0.9, label:'National Theatre', paths:[
    'M4 100 V84 H30 V100 Z','M4 84 Q17 62 30 84 Z','M4 84 H30 V81 H4 Z','M9 74 H25 V71 H9 Z','M16.4 62 V56 H17.6 V62 Z',
    'M31 100 V70 H36 V100 Z','M36.4 100 V78 H40 V100 Z','M40 100 V86 H42 V100 Z'] },
  /* Rome — Colisée et coupole de Saint-Pierre */
  ROME:{ w:50, s:0.44, k:0.9, label:'Colosseum · St Peter', paths:[
    'M2 100 V66 Q14 56 26 66 V100 Z','M2 66 Q14 58 26 66 V62 Q14 54 2 62 Z',
    'M5 72 H8 V80 H5 Z','M11 70 H14 V78 H11 Z','M17 70 H20 V78 H17 Z','M23 72 H26 V80 H23 Z',
    'M5 86 H8 V94 H5 Z','M11 84 H14 V92 H11 Z','M17 84 H20 V92 H17 Z','M23 86 H26 V94 H23 Z',
    'M30 100 V78 H46 V100 Z','M31 78 Q38 58 45 78 Z','M36.6 58 V52 H39.4 V58 Z','M37.6 52 V47 H38.4 V52 Z','M33 84 H37 V94 H33 Z','M39 84 H43 V94 H39 Z'] },
  /* Francfort — Messeturm et Commerzbank */
  FRANKFURT:{ w:42, s:0.56, k:0.72, label:'Messeturm · skyline', paths:[
    'M7 100 V38 H17 V100 Z','M6 38 L12 19 L18 38 Z',
    'M20 100 V30 H28 V100 Z','M23.6 30 V11 H24.4 V30 Z',
    'M29 100 V56 H34 V100 Z','M34 100 V64 H38 V100 Z','M2 100 V72 H7 V100 Z','M38 100 V80 H42 V100 Z'] }
};
/* terrain → repère de ville (OACI et IATA ; seuls les terrains dont le repère est vérifié) */
var MAP = {
  DTTA:'TUNIS', TUN:'TUNIS', DTTJ:'DJERBA', DJE:'DJERBA', DTMB:'TUNIS', DTTX:'TUNIS',
  LFPO:'PARIS', ORY:'PARIS', LFPG:'PARIS', CDG:'PARIS', LFPB:'PARIS', LBG:'PARIS',
  EGLL:'LONDON', LHR:'LONDON', EGKK:'LONDON', LGW:'LONDON', EGLC:'LONDON', LCY:'LONDON', EGGW:'LONDON', LTN:'LONDON', EGSS:'LONDON', STN:'LONDON',
  LSGG:'GENEVA', GVA:'GENEVA', LFMN:'NICE', NCE:'NICE', LFML:'MARSEILLE', MRS:'MARSEILLE',
  LEPA:'PALMA', PMI:'PALMA', LMML:'VALLETTA', MLA:'VALLETTA', LGAV:'ATHENS', ATH:'ATHENS',
  LTFM:'ISTANBUL', IST:'ISTANBUL', LTBA:'ISTANBUL', LTFJ:'ISTANBUL', SAW:'ISTANBUL',
  OMDB:'DUBAI', DXB:'DUBAI', OMDW:'DUBAI', DWC:'DUBAI', OEJN:'JEDDAH', JED:'JEDDAH',
  KJFK:'NEWYORK', JFK:'NEWYORK', KEWR:'NEWYORK', EWR:'NEWYORK', KLGA:'NEWYORK', LGA:'NEWYORK', KTEB:'NEWYORK', TEB:'NEWYORK',
  OTHH:'DOHA', DOH:'DOHA', GOOY:'DAKAR', DKR:'DAKAR', GOBD:'DAKAR', DSS:'DAKAR', DNMM:'LAGOS', LOS:'LAGOS',
  LIRF:'ROME', FCO:'ROME', LIRA:'ROME', CIA:'ROME', EDDF:'FRANKFURT', FRA:'FRANKFURT'
};
FL.PLACES = PLACES; FL.PLACE_MAP = MAP;
FL.placeFor = function(st){ var k = MAP[st.icao] || MAP[st.iata] || MAP[String(st.given||'').toUpperCase()]; return k ? PLACES[k] : null; };
/* Composition d'un côté du bandeau, comme la maquette : aérogare basse en fond, tour de contrôle
   au bord extérieur, repère de la ville côté intérieur, arrière-plan urbain estompé. Le tout
   s'efface vers le haut et vers l'intérieur (masques) pour se fondre dans le verre du bandeau. */
FL.ZONE = 100;   /* largeur de la zone d'imagerie, en unités de hauteur de bandeau (100) */
FL.placeSvg = function(st, side){
  var pl = FL.placeFor(st), parts = [], gid = 'flp'+(side==='r'?'r':'l'), Z = FL.ZONE, mir = (side==='r');
  function grp(paths, dx, sy, sx, op, unmirrorW){
    var t = 'translate('+dx+' '+(100-100*sy)+') scale('+sx+' '+sy+')';
    var inner = paths.map(function(d){ return '<path d="'+d+'"/>'; }).join('');
    /* le côté droit est un miroir : le repère de la ville est remis dans le bon sens sur sa propre largeur */
    if(unmirrorW && mir) inner = '<g transform="translate('+unmirrorW+' 0) scale(-1 1)">'+inner+'</g>';
    parts.push('<g transform="'+t+'" opacity="'+op+'">'+inner+'</g>');
  }
  grp(SKYLINE, 0, .28, .74, .22);                      /* trame urbaine lointaine */
  grp(TERMINAL, -2, .50, .42, .42);                    /* aérogare, du bord vers l'intérieur */
  grp(TOWER, 5, .64, .74, .86);                        /* tour de contrôle de l'aérodrome */
  if(pl){ var sy = pl.s || .55, sx = sy * (pl.k || 1);
    if(pl.haze) grp(pl.haze, 32, sy, sx, .26, pl.w);   /* densité intérieure (treillis, masses) */
    grp(pl.paths, 32, sy, sx, .88, pl.w); }
  var svg = '<svg viewBox="0 0 '+Z+' 100" preserveAspectRatio="'+(mir?'xMaxYMax':'xMinYMax')+' slice" aria-hidden="true">' +
    '<defs><linearGradient id="'+gid+'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a6b93"/><stop offset="52%" stop-color="#436489"/><stop offset="100%" stop-color="#7e9cbf"/></linearGradient>' +
    '<linearGradient id="'+gid+'v" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c2c2c2"/><stop offset="34%" stop-color="#e8e8e8"/><stop offset="100%" stop-color="#fff"/></linearGradient>' +
    '<linearGradient id="'+gid+'h" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#fff"/><stop offset="55%" stop-color="#fafafa"/><stop offset="80%" stop-color="#8e8e8e"/><stop offset="100%" stop-color="#000"/></linearGradient>' +
    '<mask id="'+gid+'mv" maskContentUnits="userSpaceOnUse"><rect width="'+Z+'" height="100" fill="url(#'+gid+'v)"/></mask>' +
    '<mask id="'+gid+'mh" maskContentUnits="userSpaceOnUse"><rect width="'+Z+'" height="100" fill="url(#'+gid+'h)"/></mask></defs>' +
    '<g mask="url(#'+gid+'mh)"><g mask="url(#'+gid+'mv)" fill="url(#'+gid+'g)"'+(mir?' transform="translate('+Z+' 0) scale(-1 1)"':'')+'>'+parts.join('')+'</g></g></svg>';
  return { svg:svg, label: pl ? pl.label : null };
};


/* Ville métropolitaine des terrains du réseau (le registre donne la commune : Spata pour ATH,
   Mellita pour DJE, Marignane pour MRS…). Terrain inconnu → ville du registre, sans le département. */
FL.CITY = { DTTA:'Tunis', TUN:'Tunis', DTTJ:'Djerba', DJE:'Djerba', DTMB:'Monastir', MIR:'Monastir', DTTX:'Sfax', SFA:'Sfax', DTTZ:'Tozeur', TOE:'Tozeur', DTNH:'Enfidha', NBE:'Enfidha',
  LFPO:'Paris', ORY:'Paris', LFPG:'Paris', CDG:'Paris', LFPB:'Paris', LBG:'Paris',
  EGLL:'London', LHR:'London', EGKK:'London', LGW:'London', EGLC:'London', LCY:'London', EGGW:'London', LTN:'London', EGSS:'London', STN:'London',
  LSGG:'Geneva', GVA:'Geneva', LSZH:'Zurich', ZRH:'Zurich', LFMN:'Nice', NCE:'Nice', LFML:'Marseille', MRS:'Marseille', LFLL:'Lyon', LYS:'Lyon', LFBO:'Toulouse', TLS:'Toulouse',
  LEPA:'Palma de Mallorca', PMI:'Palma de Mallorca', LEMD:'Madrid', MAD:'Madrid', LEBL:'Barcelona', BCN:'Barcelona',
  LMML:'Valletta', MLA:'Valletta', LGAV:'Athens', ATH:'Athens', LTFM:'Istanbul', IST:'Istanbul', LTFJ:'Istanbul', SAW:'Istanbul', LTBA:'Istanbul',
  OMDB:'Dubai', DXB:'Dubai', OMDW:'Dubai', DWC:'Dubai', OMAA:'Abu Dhabi', AUH:'Abu Dhabi', OTHH:'Doha', DOH:'Doha', OBBI:'Manama', BAH:'Manama',
  OEJN:'Jeddah', JED:'Jeddah', OERK:'Riyadh', RUH:'Riyadh', HECA:'Cairo', CAI:'Cairo', GMMN:'Casablanca', CMN:'Casablanca', DAAG:'Algiers', ALG:'Algiers', HLLT:'Tripoli', TIP:'Tripoli',
  KJFK:'New York', JFK:'New York', KEWR:'New York', EWR:'New York', KLGA:'New York', LGA:'New York', KTEB:'New York', TEB:'New York',
  GOOY:'Dakar', DKR:'Dakar', GOBD:'Dakar', DSS:'Dakar', DNMM:'Lagos', LOS:'Lagos',
  LIRF:'Rome', FCO:'Rome', LIRA:'Rome', CIA:'Rome', LIMC:'Milan', MXP:'Milan', LIML:'Milan', LIN:'Milan',
  EDDF:'Frankfurt', FRA:'Frankfurt', EDDM:'Munich', MUC:'Munich', EHAM:'Amsterdam', AMS:'Amsterdam', EBBR:'Brussels', BRU:'Brussels', LOWW:'Vienna', VIE:'Vienna', LPPT:'Lisbon', LIS:'Lisbon' };
FL.cityOf = function(st){
  var c = FL.CITY[st.icao] || FL.CITY[st.iata] || FL.CITY[String(st.given||'').toUpperCase()];
  if(c) return c;
  return String(st.city||'').split(',')[0].trim();
};

/* ---------------------------------------------------------------- drapeaux */
/* Drapeaux nationaux vectoriels (boîte 30×20) — pas d'emoji. Un pays sans dessin affiche
   une pastille neutre portant son code ISO. */
var F = {
  TN:'<rect width="30" height="20" fill="#e70013"/><circle cx="15" cy="10" r="6" fill="#fff"/><circle cx="14.6" cy="10" r="4.5" fill="#e70013"/><circle cx="16.4" cy="10" r="3.6" fill="#fff"/><path d="m16.9 6.6.9 2.6 2.7.1-2.1 1.7.7 2.6-2.2-1.5-2.3 1.4.8-2.6-2.1-1.8 2.7-.2z" fill="#e70013"/>',
  FR:'<rect width="10" height="20" fill="#002395"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ed2939"/>',
  GB:'<rect width="30" height="20" fill="#012169"/><path d="M0 0 30 20M30 0 0 20" stroke="#fff" stroke-width="4"/><path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" stroke-width="2.2"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6.6"/><path d="M15 0V20M0 10H30" stroke="#c8102e" stroke-width="4"/>',
  CH:'<rect width="30" height="20" fill="#d52b1e"/><path d="M13.2 4.4h3.6v3.8h3.8v3.6h-3.8v3.8h-3.6v-3.8H9.4V8.2h3.8z" fill="#fff"/>',
  ES:'<rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/>',
  MT:'<rect width="15" height="20" fill="#fff"/><rect x="15" width="15" height="20" fill="#cf142b"/><path d="M2.6 2.6h1.5v1.4h1.4v1.5H4.1v1.4H2.6V5.5H1.2V4h1.4z" fill="#c0c0c0"/>',
  GR:'<rect width="30" height="20" fill="#fff"/><g fill="#0d5eaf"><rect width="30" height="2.22"/><rect y="4.44" width="30" height="2.22"/><rect y="8.89" width="30" height="2.22"/><rect y="13.33" width="30" height="2.22"/><rect y="17.78" width="30" height="2.22"/><rect width="11.1" height="11.1"/></g><path d="M4.4 0h2.2v11.1H4.4z" fill="#fff"/><path d="M0 4.4h11.1v2.3H0z" fill="#fff"/>',
  TR:'<rect width="30" height="20" fill="#e30a17"/><circle cx="12" cy="10" r="5" fill="#fff"/><circle cx="13.6" cy="10" r="4" fill="#e30a17"/><path d="m18.4 6.4.9 2.7 2.8.1-2.2 1.7.7 2.7-2.2-1.6-2.3 1.5.8-2.7-2.1-1.8 2.8-.1z" fill="#fff"/>',
  AE:'<rect width="30" height="20" fill="#00732f"/><rect y="6.67" width="30" height="6.66" fill="#fff"/><rect y="13.33" width="30" height="6.67"/><rect width="7.5" height="20" fill="#ff0000"/>',
  SA:'<rect width="30" height="20" fill="#006c35"/><rect x="5" y="12.6" width="20" height="1.5" fill="#fff"/><path d="M24 13.35 27 12v2.7z" fill="#fff"/><path d="M7 7.4h1v2h1.4v-2h1v2h1.4v-2h1v3H7z" fill="#fff"/><path d="M13.4 7h6.2v1.2h-6.2z" fill="#fff"/>',
  US:'<rect width="30" height="20" fill="#fff"/><g fill="#b22234"><rect width="30" height="1.54"/><rect y="3.08" width="30" height="1.54"/><rect y="6.15" width="30" height="1.54"/><rect y="9.23" width="30" height="1.54"/><rect y="12.31" width="30" height="1.54"/><rect y="15.38" width="30" height="1.54"/><rect y="18.46" width="30" height="1.54"/></g><rect width="13" height="10.77" fill="#3c3b6e"/><g fill="#fff"><circle cx="2.2" cy="2" r=".7"/><circle cx="5.4" cy="2" r=".7"/><circle cx="8.6" cy="2" r=".7"/><circle cx="11.4" cy="2" r=".7"/><circle cx="3.8" cy="4.2" r=".7"/><circle cx="7" cy="4.2" r=".7"/><circle cx="10" cy="4.2" r=".7"/><circle cx="2.2" cy="6.4" r=".7"/><circle cx="5.4" cy="6.4" r=".7"/><circle cx="8.6" cy="6.4" r=".7"/><circle cx="11.4" cy="6.4" r=".7"/><circle cx="3.8" cy="8.6" r=".7"/><circle cx="7" cy="8.6" r=".7"/><circle cx="10" cy="8.6" r=".7"/></g>',
  QA:'<rect width="30" height="20" fill="#8d1b3d"/><path d="M0 0h9l4 1.1-4 1.1 4 1.1-4 1.1 4 1.1-4 1.1 4 1.1-4 1.1 4 1.1-4 1.1 4 1.1-4 1.1 4 1.1-4 1.1 4 1.1-4 1.1 4 1.1-4 1.1H0z" fill="#fff"/>',
  SN:'<rect width="10" height="20" fill="#00853f"/><rect x="10" width="10" height="20" fill="#fdef42"/><rect x="20" width="10" height="20" fill="#e31b23"/><path d="m15 6.6 1.1 3.3 3.4.1-2.7 2.1.9 3.3-2.7-2-2.8 1.9 1-3.3-2.6-2.2 3.4-.1z" fill="#00853f"/>',
  NG:'<rect width="10" height="20" fill="#008751"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#008751"/>',
  IT:'<rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/>',
  DE:'<rect width="30" height="20" fill="#000"/><rect y="6.67" width="30" height="6.66" fill="#dd0000"/><rect y="13.33" width="30" height="6.67" fill="#ffce00"/>',
  BH:'<rect width="30" height="20" fill="#ce1126"/><path d="M0 0h8l4 2-4 2 4 2-4 2 4 2-4 2 4 2-4 2 4 2-4 2H0z" fill="#fff"/>',
  EG:'<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#ce1126"/><rect y="13.33" width="30" height="6.67"/><path d="m15 8.4 1 2.2h-2z" fill="#c09300"/>',
  MA:'<rect width="30" height="20" fill="#c1272d"/><path d="m15 5.6 2.1 6.4-5.5-4h6.8l-5.5 4z" fill="none" stroke="#006233" stroke-width="1.1"/>',
  DZ:'<rect width="15" height="20" fill="#006233"/><rect x="15" width="15" height="20" fill="#fff"/><circle cx="15" cy="10" r="5" fill="#d21034"/><circle cx="16.6" cy="10" r="4" fill="#fff"/><path d="m18.2 7.6.6 1.8h1.9l-1.5 1.2.5 1.8-1.5-1.1-1.5 1 .5-1.7-1.4-1.2h1.9z" fill="#d21034"/>',
  LY:'<rect width="30" height="20" fill="#239e46"/><rect width="30" height="13.33" fill="#fff"/><rect width="30" height="6.67" fill="#e70013"/>',
  NL:'<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#ae1c28"/><rect y="13.33" width="30" height="6.67" fill="#21468b"/>',
  BE:'<rect width="10" height="20"/><rect x="10" width="10" height="20" fill="#fae042"/><rect x="20" width="10" height="20" fill="#ed2939"/>',
  PT:'<rect width="30" height="20" fill="#ff0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="3.4" fill="#ffff00" stroke="#fff" stroke-width=".6"/>',
  AT:'<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#ed2939"/><rect y="13.33" width="30" height="6.67" fill="#ed2939"/>',
  SE:'<rect width="30" height="20" fill="#006aa7"/><rect y="8" width="30" height="4" fill="#fecc00"/><rect x="9" width="4" height="20" fill="#fecc00"/>',
  DK:'<rect width="30" height="20" fill="#c60c30"/><rect y="8" width="30" height="4" fill="#fff"/><rect x="9" width="4" height="20" fill="#fff"/>',
  IE:'<rect width="10" height="20" fill="#169b62"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ff883e"/>',
  TD:'', KW:'<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#007a3d"/><rect y="13.33" width="30" height="6.67" fill="#ce1126"/><path d="M0 0h8v20H0z"/>',
  JO:'<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67"/><rect y="13.33" width="30" height="6.67" fill="#007a3d"/><path d="M0 0v20l10-10z" fill="#ce1126"/>',
  LB:'<rect width="30" height="20" fill="#fff"/><rect width="30" height="5" fill="#ed1c24"/><rect y="15" width="30" height="5" fill="#ed1c24"/><path d="m15 7 3 5h-6z" fill="#00a651"/>'
};
FL.FLAGS = F;
FL.flagSvg = function(iso2){
  var k = String(iso2||'').toUpperCase();
  if(!F[k]) return null;
  return '<svg class="fl-flagimg" viewBox="0 0 30 20" preserveAspectRatio="none" aria-label="'+k+'">'+F[k]+'</svg>';
};
})(registry)


export const { placeFor, placeSvg, flagSvg, PLACES, PLACE_MAP, FLAGS, ZONE } = registry.TNPFL
