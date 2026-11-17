/* dark.jeanchri.com — interactions
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

	/* ---------- 3. portrait-miroir : une figure différente à chaque visite ---------- */

	const toile = document.getElementById('portrait');

	if (toile) {
		const ctx = toile.getContext('2d');
		const graine = Math.random() * 100000;

		let L = 0;
		let H = 0;
		let centre = 0;
		let lignes = [];
		let points = [];
		let parallaxe = 0;
		let cibleParallaxe = 0;

		const alea = (i) => {
			const x = Math.sin(i * 12.9898 + graine) * 43758.5453;
			return x - Math.floor(x);
		};

		// demi-largeur du buste, en fraction de la hauteur du canvas
		const lisser = (a, b, x) => {
			const v = clamp((x - a) / (b - a), 0, 1);
			return v * v * (3 - 2 * v);
		};

		const profil = (t) => {
			const cou = 0.076;

			if (t <= 0.505) {
				// tête : superellipse (crâne plat, mâchoire resserrée)
				const u = t / 0.505;
				const n = 2.7;
				const base = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), n)), 1 / n);
				const machoire = 1 - 0.22 * lisser(0.6, 1, u);
				// la mâchoire rejoint le cou sans former de pointe
				return Math.max(0.172 * base * machoire, cou);
			}

			if (t <= 0.585) return cou;

			// épaules : trapèzes qui se posent puis débordent du cadre
			const s = (t - 0.585) / 0.415;
			return cou + 0.24 * lisser(0, 0.62, s);
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

			const nombre = L < 520 ? 74 : 128;
			lignes = Array.from({ length: nombre }, (_, i) => ({
				t: i / (nombre - 1),
				bruit: alea(i),
				phase: alea(i + 700) * Math.PI * 2,
				accent: i % 11 === 0
			}));

			if (mouvementReduit) {
				points = [];
			} else {
				points = Array.from({ length: L < 520 ? 18 : 34 }, () => ({
					x: Math.random() * L,
					y: Math.random() * H,
					vx: (Math.random() - 0.5) * 0.12,
					vy: (Math.random() - 0.5) * 0.12,
					r: Math.random() * 1.3 + 0.3
				}));
			}
		};

		const dessiner = (temps) => {
			ctx.clearRect(0, 0, L, H);

			const souffle = Math.sin(temps * 0.00042);
			const haut = H * 0.1;
			const hauteur = H * 0.84;

			// atmosphère : poussières dérivantes
			for (const p of points) {
				p.x += p.vx;
				p.y += p.vy;
				if (p.x < -10) p.x = L + 10;
				if (p.x > L + 10) p.x = -10;
				if (p.y < -10) p.y = H + 10;
				if (p.y > H + 10) p.y = -10;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(242,240,250,${0.04 + p.r * 0.06})`;
				ctx.fill();
			}

			// la figure, ligne par ligne
			for (const ligne of lignes) {
				const y = haut + ligne.t * hauteur + souffle * 3;
				const demi = profil(ligne.t) * H;
				const largeur = demi * (0.95 + ligne.bruit * 0.08);

				// bande de balayage qui traverse lentement le buste
				const balayage = Math.exp(-Math.pow((ligne.t - ((temps * 0.00006) % 1.4) + 0.2) * 9, 2));
				const base = 0.13 + balayage * 0.34 + (ligne.accent ? 0.12 : 0);

				ctx.beginPath();
				for (let k = 0; k <= 26; k++) {
					const p = (k / 26) * 2 - 1;
					const x = centre + parallaxe + p * largeur;
					const ondulation =
						Math.sin(temps * 0.0007 + p * 2.4 + ligne.phase) * 1.3 +
						Math.sin(p * 5.1 + ligne.phase * 2) * 0.9;
					const yy = y + ondulation;
					if (k === 0) ctx.moveTo(x, yy);
					else ctx.lineTo(x, yy);
				}
				ctx.strokeStyle = ligne.accent
					? `rgba(123,61,255,${base * 1.5})`
					: `rgba(242,240,250,${base * 0.62})`;
				ctx.lineWidth = ligne.accent ? 0.85 : 0.55;
				ctx.stroke();
			}

			// contour : rend la figure immédiatement lisible
			for (const cote of [-1, 1]) {
				ctx.beginPath();
				for (let i = 0; i < lignes.length; i++) {
					const ligne = lignes[i];
					const y = haut + ligne.t * hauteur + souffle * 3;
					const largeur = profil(ligne.t) * H * (0.95 + ligne.bruit * 0.08);
					const x = centre + parallaxe + cote * largeur;
					if (i === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				}
				ctx.strokeStyle = 'rgba(242,240,250,.34)';
				ctx.lineWidth = 1;
				ctx.stroke();
			}

			if (!mouvementReduit) {
				parallaxe = lerp(parallaxe, cibleParallaxe, 0.045);
				requestAnimationFrame(dessiner);
			}
		};

		const dimensionner = () => {
			const ancienL = L;
			construire();
			if (ancienL !== L) parallaxe = 0;
		};

		dimensionner();
		requestAnimationFrame(dessiner);

		window.addEventListener('resize', dimensionner);

		if (!sansSouris && !mouvementReduit) {
			window.addEventListener('pointermove', (e) => {
				cibleParallaxe = ((e.clientX / window.innerWidth) - 0.5) * -22;
			}, { passive: true });
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
		const cle = 'dark.jeanchri.visite';
		const maintenant = Date.now();
		let etat = null;

		try {
			etat = JSON.parse(localStorage.getItem(cle) || 'null');
		} catch (e) {
			etat = null;
		}

		let texte = '';

		if (!etat || !etat.derniere) {
			texte = 'première visite — je note l’heure';
			etat = { premiere: maintenant, derniere: maintenant, visites: 1 };
		} else {
			const jours = Math.floor((maintenant - etat.derniere) / 86400000);
			const heures = Math.floor((maintenant - etat.derniere) / 3600000);
			etat.derniere = maintenant;
			etat.visites = (etat.visites || 1) + 1;

			if (heures < 1) texte = `visite n°${etat.visites} — il y a quelques minutes`;
			else if (jours < 1) texte = `visite n°${etat.visites} — il y a ${heures} heure${heures > 1 ? 's' : ''}`;
			else if (jours === 1) texte = `visite n°${etat.visites} — tu reviens après un jour`;
			else if (jours < 60) texte = `visite n°${etat.visites} — tu reviens après ${jours} jours`;
			else texte = `visite n°${etat.visites} — ça faisait longtemps`;
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
