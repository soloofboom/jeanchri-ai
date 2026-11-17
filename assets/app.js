/* ai.jeanchri.com : interactions
   Vanilla JS, aucune dépendance. Tout est neutralisé si prefers-reduced-motion. */

(() => {
	'use strict';

	const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const sansSouris = window.matchMedia('(hover: none), (pointer: coarse)').matches;
	const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
	const lerp = (a, b, t) => a + (b - a) * t;

	document.getElementById('annee').textContent = new Date().getFullYear();

	/* ---------- 1. intro ---------- */

	const intro = document.getElementById('intro');
	const compteur = document.getElementById('intro-count');

	if (mouvementReduit || !intro) {
		if (intro) intro.remove();
		document.body.classList.add('pret');
	} else {
		document.body.classList.add('verrou');
		document.body.classList.remove('pret');

		const debut = performance.now();
		const duree = 1300;

		const tic = (maintenant) => {
			const p = clamp((maintenant - debut) / duree, 0, 1);
			compteur.textContent = String(Math.round(p * 100)).padStart(2, '0');
			if (p < 1) {
				requestAnimationFrame(tic);
			} else {
				setTimeout(() => {
					intro.classList.add('sortie');
					document.body.classList.remove('verrou');
					document.body.classList.add('pret');
					setTimeout(() => intro.remove(), 1100);
				}, 180);
			}
		};
		requestAnimationFrame(tic);
	}

	/* ---------- 2. barre de progression ---------- */

	const barre = document.getElementById('progress-bar');

	/* ---------- 3. portrait : profil gravé, hachuré comme un scan ---------- */

	const toile = document.getElementById('portrait');

	if (toile) {
		const ctx = toile.getContext('2d');
		const graine = Math.random() * 100000;

		let L = 0;
		let H = 0;
		let centre = 0;
		let chemin = null;
		let poussieres = [];
		let lumiere = null;
		let ascii = null;
		let asciiFond = null;
		const curseur = { x: -9999, y: -9999, dans: false };
		
		let cadres = { x: 0, y: 0, w: 0, h: 0 };
		let decalage = 0;
		let decalageCible = 0;

		// profil en coordonnées normalisées (0..1), face tournée vers la gauche
		// demi-silhouette droite (de dos) ; la gauche est obtenue par miroir
		const demi = [
			[0.500, 0.028], [0.552, 0.031], [0.604, 0.042], [0.650, 0.064],
			[0.686, 0.100], [0.708, 0.146], [0.719, 0.198], [0.722, 0.248],
			[0.716, 0.290],
			[0.702, 0.330], [0.680, 0.362], [0.664, 0.386], [0.648, 0.402],
			[0.634, 0.418], [0.628, 0.442], [0.640, 0.460], [0.672, 0.476],
			[0.722, 0.492], [0.772, 0.510], [0.815, 0.536], [0.860, 0.575],
			[0.892, 0.624], [0.915, 0.690], [0.930, 0.780], [0.940, 0.900],
			[0.945, 1.150]
		];

		const profil = demi.concat(
			demi.slice(0, -1).reverse().map(([x, y]) => [1 - x, y])
		);

		// logo Rif (grenouille) rendu en ASCII, 54 colonnes
		const RIF = [
			'                                 -%@@@@%-    :%@@@@=    ',
			'                                %@@*--+%@%  -@@=. .--   ',
			'                               #%: :---- -%@@#+:=%@@@   ',
			'                             .*=-@@@@@@@@#:@@@@@@@*=-   ',
			'                           .#@@@:*@@@@@@#.@@@@@@@@@@@%: ',
			'                         .%@@@@@@%==--+=%@@@@@@@@@@@@@@+',
			'                       --.#@@@@@@@@@@@@@@@#:------------',
			'                   -#@@@@@*.+@@@@@@@@@@@#:#@@@@@@@@@@@@=',
			'               .+@@@@@@@@@@@%--%@@@@@@#:#@@@@@@@@@@@#-  ',
			'             -%@@@@@@@@@@@@@@@@+.#@@%:*@@@@@@%:         ',
			'           -@@@@@#-@@@@@@@@@@@@@@* .+@@@@@@@--%         ',
			'         -:+%@@%:+%:-@@@@@@@@@@@%:*@@@@@@@-:%@-         ',
			'       -@@@@#.:=@@@@@:-@@@@@@@%:*@@@@@@@-:%@@-          ',
			'      #@@@@@:-@@@@@@@@@--@@@%:#@@@@@@@=:%@@@-           ',
			'    .@@@@@:-@@@@@@@@@@@@@--:*@@@@@@@=:%@@@%.            ',
			'   .@@@@--@@@@@@: *@@@@@@@@@@@@@@@+ #@@@@---            ',
			'  .@@@--@@@@@@--@@+.#@@@@@@@@@@@+.= @@@=:@@@%           ',
			'  @@--@@@@@@-:@@@@@@-.#@@@@@@@+.#@@ @+:%@@@@@*          ',
			' .--@@@@@@=.%@@@@@@@@@-:%@@@+.#@@@%  :@@@@@@@@:         ',
			' :@@*==*###*-:=#@@@@@@@%::*.#@@@@@@#=: :#@@@@@@@@@#*-   ',
			'=#:*@@@@@@@@@@@+ -@@@@@@@%.:@@@@@@@@@@@@+:#@@@@@@@@@@@%-'
		];

		const RAMPE = ' .:-=+*#%@';

		const courbe = (pts) => {
			const p = new Path2D();
			const n = pts.length;
			p.moveTo(pts[0][0], pts[0][1]);
			for (let i = 0; i < n; i++) {
				const p0 = pts[(i - 1 + n) % n];
				const p1 = pts[i];
				const p2 = pts[(i + 1) % n];
				const p3 = pts[(i + 2) % n];
				p.bezierCurveTo(
					p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
					p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
					p2[0], p2[1]
				);
			}
			p.closePath();
			return p;
		};

		const construire = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const rect = toile.getBoundingClientRect();
			L = rect.width;
			H = rect.height;
			toile.width = Math.round(L * dpr);
			toile.height = Math.round(H * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			centre = L * 0.5;

			const hauteurFigure = H * 0.87;
			const largeurFigure = Math.min(hauteurFigure * 0.63, L * 0.94);
			cadres = {
				w: largeurFigure,
				h: hauteurFigure,
				x: centre - largeurFigure / 2,
				y: H * 0.05
			};

			chemin = courbe(profil.map(([px, py]) => [
				cadres.x + px * cadres.w,
				cadres.y + py * cadres.h
			]));

			lumiere = ctx.createLinearGradient(cadres.x, 0, cadres.x + cadres.w, 0);
			lumiere.addColorStop(0.00, 'rgba(242,240,250,.02)');
			lumiere.addColorStop(0.22, 'rgba(242,240,250,.24)');
			lumiere.addColorStop(0.48, 'rgba(242,240,250,.19)');
			lumiere.addColorStop(0.78, 'rgba(242,240,250,.10)');
			lumiere.addColorStop(1.00, 'rgba(242,240,250,.02)');

			// calque ASCII du logo Rif, rendu une seule fois
			const cibleW = cadres.w * 0.58;
			const cellW = cibleW / RIF[0].length;
			const cellH = cellW * 2;
			ascii = document.createElement('canvas');
			ascii.width = Math.ceil(cibleW);
			ascii.height = Math.ceil(cellH * RIF.length);
			const ca = ascii.getContext('2d');
			ca.font = `${(cellW / 0.6).toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
			ca.textBaseline = 'top';
			for (let r = 0; r < RIF.length; r++) {
				for (let c = 0; c < RIF[r].length; c++) {
					const ch = RIF[r][c];
					if (ch === ' ') continue;
					const densite = RAMPE.indexOf(ch);
					const a = densite < 0 ? 0.28 : 0.10 + densite * 0.055;
					ca.fillStyle = `rgba(168,120,255,${a.toFixed(3)})`;
					ca.fillText(ch, c * cellW, r * cellH);
				}
			}

			// fond : la silhouette tapissée de caractères pâles
			const celW = Math.max(7, Math.round(cadres.w / 46));
			const celH = Math.round(celW * 1.9);
			const cols = Math.floor(cadres.w / celW);
			const rangs = Math.floor(cadres.h / celH);
			asciiFond = document.createElement('canvas');
			asciiFond.width = cols * celW;
			asciiFond.height = rangs * celH;
			const cf = asciiFond.getContext('2d');
			cf.font = `${(celW / 0.6).toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
			cf.textBaseline = 'top';
			const jeu = '.:-=+*';
			for (let r = 0; r < rangs; r++) {
				for (let c = 0; c < cols; c++) {
					if (Math.random() < 0.22) continue;
					const ch = jeu[Math.floor(Math.random() * jeu.length)];
					cf.fillStyle = `rgba(190,175,235,${(0.12 + Math.random() * 0.22).toFixed(3)})`;
					cf.fillText(ch, c * celW, r * celH);
				}
			}

			poussieres = Array.from({ length: L < 520 ? 16 : 30 }, () => ({
				x: Math.random() * L,
				y: Math.random() * H,
				vx: (Math.random() - 0.5) * 0.1,
				vy: (Math.random() - 0.5) * 0.1,
				r: Math.random() * 1.2 + 0.3
			}));
		};

		const dessiner = (temps) => {
			ctx.clearRect(0, 0, L, H);

			const souffle = Math.sin(temps * 0.0004) * 2.2;
			if (chemin && curseur.x > -999) {
				// le test se fait sans transformation : le chemin est en pixels CSS
				ctx.save();
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				curseur.dans = ctx.isPointInPath(chemin, curseur.x, curseur.y);
				ctx.restore();
			}
			const balayage = ((temps * 0.000055) % 1.25) - 0.12;

			ctx.save();
			ctx.translate(decalage, souffle);

			// halo
			const hx = cadres.x + cadres.w * 0.5;
			const hy = cadres.y + cadres.h * 0.28;
			const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, cadres.h * 0.42);
			halo.addColorStop(0, 'rgba(85,0,232,.13)');
			halo.addColorStop(0.6, 'rgba(85,0,232,.035)');
			halo.addColorStop(1, 'rgba(85,0,232,0)');
			ctx.fillStyle = halo;
			ctx.beginPath();
			ctx.arc(hx, hy, cadres.h * 0.42, 0, Math.PI * 2);
			ctx.fill();

			// poussières
			for (const p of poussieres) {
				p.x += p.vx;
				p.y += p.vy;
				if (p.x < -10) p.x = L + 10;
				if (p.x > L + 10) p.x = -10;
				if (p.y < -10) p.y = H + 10;
				if (p.y > H + 10) p.y = -10;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(242,240,250,${0.04 + p.r * 0.05})`;
				ctx.fill();
			}

			// l'intérieur de la silhouette
			ctx.save();
			ctx.clip(chemin);

			// hachurage de scan, très effacé
			const pas = Math.max(2.4, cadres.h / 170);
			ctx.strokeStyle = lumiere;
			ctx.globalAlpha = 0.35;
			ctx.lineWidth = 0.7;
			ctx.beginPath();
			for (let y = cadres.y; y < cadres.y + cadres.h; y += pas) {
				ctx.moveTo(cadres.x - 4, y);
				ctx.lineTo(cadres.x + cadres.w + 4, y);
			}
			ctx.stroke();
			ctx.globalAlpha = 1;

			// tapisserie de caractères pâles
			if (asciiFond) {
				ctx.globalAlpha = 0.55;
				ctx.drawImage(asciiFond, cadres.x, cadres.y, asciiFond.width, asciiFond.height);
				ctx.globalAlpha = 1;
			}

			// logo Rif en ASCII, plus contrasté que la tapisserie
			if (ascii) {
				const ax = cadres.x + (cadres.w - ascii.width) / 2;
				const ay = cadres.y + cadres.h * 0.66;
				ctx.globalAlpha = 0.6 + Math.abs(balayage - 0.5) * 0.18;
				ctx.drawImage(ascii, ax, ay);
				ctx.globalAlpha = 1;
			}

			// lumière qui suit le curseur
			if (curseur.dans && asciiFond) {
				const r = Math.min(cadres.w, cadres.h) * 0.40;
				const haloCurseur = ctx.createRadialGradient(curseur.x, curseur.y, 0, curseur.x, curseur.y, r);
				haloCurseur.addColorStop(0, 'rgba(178,132,255,.62)');
				haloCurseur.addColorStop(0.45, 'rgba(123,61,255,.26)');
				haloCurseur.addColorStop(1, 'rgba(123,61,255,0)');
				ctx.fillStyle = haloCurseur;
				ctx.beginPath();
				ctx.arc(curseur.x, curseur.y, r, 0, Math.PI * 2);
				ctx.fill();

				ctx.save();
				ctx.beginPath();
				ctx.arc(curseur.x, curseur.y, r * 0.8, 0, Math.PI * 2);
				ctx.clip();
				ctx.globalAlpha = 1;
				ctx.drawImage(asciiFond, cadres.x, cadres.y, asciiFond.width, asciiFond.height);
				if (ascii) ctx.drawImage(ascii, cadres.x + (cadres.w - ascii.width) / 2, cadres.y + cadres.h * 0.66);
				ctx.globalAlpha = 1;
				ctx.restore();
			}

			// bande de balayage
			const yBalayage = cadres.y + balayage * cadres.h;
			const gradBalayage = ctx.createLinearGradient(0, yBalayage - cadres.h * 0.06, 0, yBalayage + cadres.h * 0.06);
			gradBalayage.addColorStop(0, 'rgba(123,61,255,0)');
			gradBalayage.addColorStop(0.5, 'rgba(160,110,255,.16)');
			gradBalayage.addColorStop(1, 'rgba(123,61,255,0)');
			ctx.fillStyle = gradBalayage;
			ctx.fillRect(cadres.x, yBalayage - cadres.h * 0.06, cadres.w, cadres.h * 0.12);

			ctx.restore();

			ctx.restore();

			if (!mouvementReduit) {
				decalage = decalage + (decalageCible - decalage) * 0.05;
				requestAnimationFrame(dessiner);
			}
		};

		const dimensionner = () => {
			construire();
			decalage = 0;
		};

		dimensionner();
		requestAnimationFrame(dessiner);

		window.addEventListener('resize', dimensionner);
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(dimensionner);

		if (!sansSouris && !mouvementReduit) {
			window.addEventListener('pointermove', (e) => {
				decalageCible = ((e.clientX / window.innerWidth) - 0.5) * -14;
				const rect = toile.getBoundingClientRect();
				curseur.x = e.clientX - rect.left;
				curseur.y = e.clientY - rect.top;
			}, { passive: true });

			window.addEventListener('pointerleave', () => { curseur.dans = false; });
		}
	}

	/* ---------- 4. curseur + cadre de détection ---------- */

	const curseur = document.getElementById('cursor');

	if (curseur && !sansSouris && !mouvementReduit) {
		let cx = window.innerWidth / 2;
		let cy = window.innerHeight / 2;
		let tx = cx;
		let ty = cy;

		window.addEventListener('pointermove', (e) => {
			tx = e.clientX;
			ty = e.clientY;
		}, { passive: true });

		const boucle = () => {
			cx = lerp(cx, tx, 0.18);
			cy = lerp(cy, ty, 0.18);
			curseur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
			requestAnimationFrame(boucle);
		};
		requestAnimationFrame(boucle);

		document.querySelectorAll('[data-hover]').forEach((el) => {
			el.addEventListener('pointerenter', () => document.body.classList.add('cursor-actif'));
			el.addEventListener('pointerleave', () => document.body.classList.remove('cursor-actif'));
		});
	}

	const cadre = document.getElementById('cadre');

	if (cadre && !sansSouris && !mouvementReduit) {
		const cibles = document.querySelectorAll('[data-detect], [data-texte] p');

		cibles.forEach((el) => {
			el.addEventListener('pointerenter', () => {
				const r = el.getBoundingClientRect();
				const marge = 10;
				cadre.style.left = `${r.left - marge}px`;
				cadre.style.top = `${r.top - marge}px`;
				cadre.style.width = `${r.width + marge * 2}px`;
				cadre.style.height = `${r.height + marge * 2}px`;
				cadre.classList.add('actif');
			});
			el.addEventListener('pointerleave', () => cadre.classList.remove('actif'));
		});

		window.addEventListener('scroll', () => cadre.classList.remove('actif'), { passive: true });
	}

	/* ---------- 5. galerie horizontale pilotée au scroll ---------- */

	const section = document.getElementById('galerie');
	const rail = document.getElementById('rail');

	if (section && rail) {
		let horizontal = false;

		const distance = () => Math.max(0, rail.scrollWidth - window.innerWidth + 40);

		const dimensionner = () => {
			horizontal = window.innerWidth > 900 && !mouvementReduit;
			if (horizontal) {
				section.style.height = `${window.innerHeight + distance()}px`;
			} else {
				section.style.height = '';
				rail.style.transform = '';
			}
		};

		const defiler = () => {
			if (!horizontal) return;
			const d = distance();
			const depart = section.offsetTop;
			const p = clamp((window.scrollY - depart) / (d || 1), 0, 1);
			rail.style.transform = `translate3d(${-p * d}px, 0, 0)`;
		};

		let attente = false;
		const surScroll = () => {
			if (attente) return;
			attente = true;
			requestAnimationFrame(() => {
				defiler();
				if (barre) {
					const total = document.documentElement.scrollHeight - window.innerHeight;
					barre.style.width = `${clamp(window.scrollY / (total || 1), 0, 1) * 100}%`;
				}
				attente = false;
			});
		};

		dimensionner();
		defiler();
		window.addEventListener('scroll', surScroll, { passive: true });
		window.addEventListener('resize', () => { dimensionner(); defiler(); });
		window.addEventListener('load', () => { dimensionner(); defiler(); });
	}

	/* ---------- 6. apparitions au scroll ---------- */

	const ciblesApparition = document.querySelectorAll('.alibi, .portes, .pied');
	ciblesApparition.forEach((el) => el.classList.add('monte'));

	if ('IntersectionObserver' in window) {
		const obs = new IntersectionObserver((entrees) => {
			entrees.forEach((e) => {
				if (e.isIntersecting) {
					e.target.classList.add('vu');
					obs.unobserve(e.target);
				}
			});
		}, { threshold: 0.15 });
		ciblesApparition.forEach((el) => obs.observe(el));
	} else {
		ciblesApparition.forEach((el) => el.classList.add('vu'));
	}

	/* ---------- 7. texte qui s'écrit tout seul ---------- */

	const conteneurTexte = document.querySelector('[data-texte]');

	if (conteneurTexte && !mouvementReduit) {
		const paragraphes = Array.from(conteneurTexte.querySelectorAll('p'))
			.filter((p) => !p.classList.contains('alibi-signature'));

		const lettres = [];

		paragraphes.forEach((p) => {
			const texte = p.textContent.replace(/\s+/g, ' ').trim();
			p.textContent = '';
			p.setAttribute('aria-label', texte);

			for (const ch of texte) {
				const span = document.createElement('span');
				span.textContent = ch;
				span.style.color = 'rgba(242,240,250,.22)';
				p.appendChild(span);
				lettres.push(span);
			}
		});

		let index = 0;
		let enCours = false;
		let dernier = 0;

		const ecrire = (temps) => {
			if (!enCours) return;
			const ecart = temps - dernier;
			if (ecart > 14) {
				const pas = Math.max(1, Math.round(ecart / 4));
				for (let i = 0; i < pas && index < lettres.length; i++) {
					lettres[index].style.color = '';
					index++;
				}
				dernier = temps;
			}
			if (index < lettres.length) requestAnimationFrame(ecrire);
			else enCours = false;
		};

		const lancer = () => {
			if (enCours || index >= lettres.length) return;
			enCours = true;
			dernier = performance.now();
			requestAnimationFrame(ecrire);
		};

		if ('IntersectionObserver' in window) {
			const obsTexte = new IntersectionObserver((entrees) => {
				entrees.forEach((e) => {
					if (e.isIntersecting) {
						lancer();
						obsTexte.disconnect();
					}
				});
			}, { threshold: 0.2 });
			obsTexte.observe(conteneurTexte);
		} else {
			lancer();
		}
	}

	/* ---------- 8. mémoire du visiteur (localStorage, rien d'envoyé) ---------- */

	const memoire = document.getElementById('memoire');

	if (memoire) {
		const cle = 'ai.jeanchri.visite';
		const maintenant = Date.now();
		let etat = null;

		try {
			etat = JSON.parse(localStorage.getItem(cle) || 'null');
		} catch (e) {
			etat = null;
		}

		let texte = '';

		if (!etat || !etat.derniere) {
			texte = 'première visite, je note l’heure';
			etat = { premiere: maintenant, derniere: maintenant, visites: 1 };
		} else {
			const jours = Math.floor((maintenant - etat.derniere) / 86400000);
			const heures = Math.floor((maintenant - etat.derniere) / 3600000);
			etat.derniere = maintenant;
			etat.visites = (etat.visites || 1) + 1;

			if (heures < 1) texte = `visite n°${etat.visites} · il y a quelques minutes`;
			else if (jours < 1) texte = `visite n°${etat.visites} · il y a ${heures} heure${heures > 1 ? 's' : ''}`;
			else if (jours === 1) texte = `visite n°${etat.visites} · tu reviens après un jour`;
			else if (jours < 60) texte = `visite n°${etat.visites} · tu reviens après ${jours} jours`;
			else texte = `visite n°${etat.visites} · ça faisait longtemps`;
		}

		memoire.textContent = texte;
		memoire.hidden = false;

		try {
			localStorage.setItem(cle, JSON.stringify(etat));
		} catch (e) { /* navigation privée : on n'insiste pas */ }
	}

	/* ---------- 9. aperçu flottant sur les portes ---------- */

	const apercu = document.getElementById('apercu');
	const imageApercu = apercu ? apercu.querySelector('img') : null;

	if (apercu && imageApercu && !sansSouris && !mouvementReduit) {
		document.querySelectorAll('[data-apercu]').forEach((lien) => {
			lien.addEventListener('pointerenter', () => {
				imageApercu.src = lien.dataset.apercu;
				apercu.classList.add('visible');
			});
			lien.addEventListener('pointerleave', () => apercu.classList.remove('visible'));
			lien.addEventListener('pointermove', (e) => {
				apercu.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(1)`;
			});
		});
	}

	/* ---------- 10. ancres internes ---------- */

	document.querySelectorAll('a[href^="#"]').forEach((a) => {
		a.addEventListener('click', (e) => {
			const cible = document.querySelector(a.getAttribute('href'));
			if (!cible) return;
			e.preventDefault();
			cible.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'start' });
		});
	});
})();
