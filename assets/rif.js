/* rif/index : logo ASCII réactif. Vanilla, aucune dépendance. */

(() => {
	'use strict';

	const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const sansSouris = window.matchMedia('(hover: none), (pointer: coarse)').matches;
	const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
	const lerp = (a, b, t) => a + (b - a) * t;

	const annee = document.getElementById('annee');
	if (annee) annee.textContent = new Date().getFullYear();

	/* ---------- barre de progression ---------- */

	const barre = document.getElementById('progress-bar');

	if (barre) {
		const majBarre = () => {
			const hauteur = document.documentElement.scrollHeight - window.innerHeight;
			barre.style.width = `${hauteur > 0 ? (window.scrollY / hauteur) * 100 : 0}%`;
		};
		window.addEventListener('scroll', majBarre, { passive: true });
		majBarre();
	}

	/* ---------- curseur ---------- */

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

	/* ---------- grenouille ASCII ---------- */

	const toile = document.getElementById('rif-logo');

	if (!toile) return;

	const ctx = toile.getContext('2d');
	const RAMPE = ' .:-=+*#%@';

	const grenouille = new Image();
	grenouille.src = '../images/rif-frog.png';

	let L = 0;
	let H = 0;
	let cellules = [];
	let cadres = { x: 0, y: 0, w: 0, h: 0 };
	let debut = 0;
	let dernier = 0;
	let source = null;

	const curseurCanvas = { x: -9999, y: -9999, actif: false };

	// recadre la grenouille sur son contenu réel
	const recadrer = () => {
		const c = document.createElement('canvas');
		c.width = grenouille.naturalWidth;
		c.height = grenouille.naturalHeight;
		const cx = c.getContext('2d');
		cx.drawImage(grenouille, 0, 0);

		const d = cx.getImageData(0, 0, c.width, c.height).data;
		let minX = c.width;
		let minY = c.height;
		let maxX = 0;
		let maxY = 0;

		for (let y = 0; y < c.height; y++) {
			for (let x = 0; x < c.width; x++) {
				if (d[(y * c.width + x) * 4 + 3] > 24) {
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
			}
		}

		source = {
			x: minX,
			y: minY,
			w: maxX - minX + 1,
			h: maxY - minY + 1
		};

		dimensionner();
	};

	const construire = () => {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const rect = toile.getBoundingClientRect();
		L = rect.width;
		H = rect.height;
		toile.width = Math.round(L * dpr);
		toile.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		cellules = [];
		if (!source) return;

		const cols = L < 560 ? 64 : 88;
		const rows = Math.max(10, Math.round(cols * (source.h / source.w) * 0.5));

		const echantillon = document.createElement('canvas');
		echantillon.width = cols;
		echantillon.height = rows;
		const ex = echantillon.getContext('2d');
		ex.drawImage(grenouille, source.x, source.y, source.w, source.h, 0, 0, cols, rows);
		const px = ex.getImageData(0, 0, cols, rows).data;

		const cellH = Math.min(H / rows, (L / cols) * 2);
		const cellW = cellH / 2;
		cadres = {
			x: (L - cols * cellW) / 2,
			y: (H - rows * cellH) / 2,
			w: cols * cellW,
			h: rows * cellH
		};

		ctx.font = `${(cellW / 0.6).toFixed(2)}px "JetBrains Mono", ui-monospace, monospace`;
		ctx.textBaseline = 'top';

		const denominateur = rows + cols * 0.4;

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const i = (r * cols + c) * 4;
				if (px[i + 3] < 90) continue;

				const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
				const densite = Math.round((1 - lum) * (RAMPE.length - 1));

				cellules.push({
					ch: RAMPE[Math.max(1, densite)],
					x: cadres.x + c * cellW,
					y: cadres.y + r * cellH,
					a: 0.46 + densite * 0.06,
					seuil: (r + c * 0.4) / denominateur
				});
			}
		}
	};

	const dessiner = (temps) => {
		if (!debut && cellules.length) debut = temps + 250;

		ctx.clearRect(0, 0, L, H);

		const hero = toile.closest('.rif-hero');
		const progression = mouvementReduit || !hero
			? 0
			: clamp(window.scrollY / (hero.offsetHeight * 0.9), 0, 1);
		const intensite = 1 - progression * 0.45;

		const centreX = cadres.x + cadres.w / 2;
		const centreY = cadres.y + cadres.h / 2;
		const halo = ctx.createRadialGradient(centreX, centreY, 0, centreX, centreY, Math.max(cadres.w, cadres.h) * 0.55);
		halo.addColorStop(0, 'rgba(85,0,232,.10)');
		halo.addColorStop(1, 'rgba(85,0,232,0)');
		ctx.fillStyle = halo;
		ctx.fillRect(0, 0, L, H);

		ctx.save();
		ctx.translate(0, progression * -26);

		const rayon = Math.max(L, H) * 0.22;

		for (const cel of cellules) {
			const avance = mouvementReduit ? 1 : clamp((temps - debut - cel.seuil * 900) / 280, 0, 1);
			if (avance <= 0) continue;

			let a = cel.a * avance * intensite;
			let teinte = '182,146,255';

			if (curseurCanvas.actif) {
				const dx = cel.x - curseurCanvas.x;
				const dy = cel.y - curseurCanvas.y;
				const distance = Math.hypot(dx, dy);
				if (distance < rayon) {
					const boost = 1 - distance / rayon;
					a = Math.min(1, a + boost * 0.85 * avance);
					teinte = '226,210,255';
				}
			}

			ctx.fillStyle = `rgba(${teinte},${a.toFixed(3)})`;
			ctx.fillText(cel.ch, cel.x, cel.y);
		}

		ctx.restore();
	};

	const boucle = (temps) => {
		if (temps - dernier >= 32) {
			dernier = temps;
			dessiner(temps);
		}
		if (!mouvementReduit) requestAnimationFrame(boucle);
	};

	const dimensionner = () => {
		construire();
		if (mouvementReduit) dessiner(performance.now());
	};

	if (grenouille.complete && grenouille.naturalWidth) {
		recadrer();
	} else {
		grenouille.addEventListener('load', recadrer, { once: true });
	}

	if (!mouvementReduit) {
		requestAnimationFrame(boucle);

		if (!sansSouris) {
			toile.addEventListener('pointermove', (e) => {
				const rect = toile.getBoundingClientRect();
				curseurCanvas.x = e.clientX - rect.left;
				curseurCanvas.y = e.clientY - rect.top;
				curseurCanvas.actif = true;
			}, { passive: true });

			toile.addEventListener('pointerleave', () => { curseurCanvas.actif = false; });
		}
	}

	window.addEventListener('resize', dimensionner);
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(dimensionner);

	/* ---------- ancres internes ---------- */

	document.querySelectorAll('a[href^="#"]').forEach((a) => {
		a.addEventListener('click', (e) => {
			const cible = document.querySelector(a.getAttribute('href'));
			if (!cible) return;
			e.preventDefault();
			cible.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'start' });
		});
	});
})();
