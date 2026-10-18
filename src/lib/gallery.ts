/**
 * Salon photography, shown in the homepage carousel.
 *
 * Every file lives in `public/gallery/` and is the salon's own material, each
 * one approved by Karin. The list and the folder have to stay in step: an
 * entry whose file has been removed renders an image request that 404s, and
 * the carousel shows a blank tile where a photo should be. `npm run
 * check:assets` verifies that, and is worth running after any photo is added
 * or pulled.
 *
 * Order matters — the carousel reads left to right, so close-up work and
 * wider room shots alternate rather than clumping.
 */
export interface GalleryImage {
    /** Path under `public/`. */
    src: string;
    /** Slovenian alt text. Describes the photo, never "slika" or "fotografija". */
    alt: string;
}

export const GALLERY_IMAGES: GalleryImage[] = [
    { src: "/gallery/hero-nohti.webp", alt: "BIAB manikura v nežnem nude odtenku" },
    { src: "/gallery/recepcija.webp", alt: "Recepcija salona Lepotilnica by Karin z logotipom na steni" },
    { src: "/gallery/french-ovalni-nohti.webp", alt: "Francoska manikura na ovalno oblikovanih nohtih" },
    { src: "/gallery/postaja.webp", alt: "Delovna postaja za manikuro z rožnatim stolom in namizno lučjo" },
    { src: "/gallery/bordo-nohti.webp", alt: "Trajni lak v bordo odtenku na ovalnih nohtih" },
    { src: "/gallery/salon-wide.webp", alt: "Pogled po salonu z delovnimi postajami in policami z laki" },
    { src: "/gallery/nezno-roza-nohti.webp", alt: "Nežno rožnat trajni lak z bleščečim prelivom" },
    { src: "/gallery/masaza.webp", alt: "Masažna miza s pripravljenimi brisačami in olji" },
    { src: "/gallery/french-kratki-nohti.webp", alt: "Francoska manikura na kratkih naravnih nohtih" },
    { src: "/gallery/trepalnice.webp", alt: "Keratinsko zvite trepalnice, bližnji posnetek očesa" },
    { src: "/gallery/pedikura-bordo.webp", alt: "Pedikura s trajnim lakom v temno rdečem odtenku" },
    { src: "/gallery/biab.webp", alt: "Bližnji posnetek BIAB nadgradnje naravnega nohta" },
    { src: "/gallery/nude-nohti.webp", alt: "Francoska poslikava v nude odtenku na kratkih nohtih" },
    { src: "/gallery/manikura.webp", alt: "Urejena manikura z zlatimi prstani" },
    { src: "/gallery/roza-nohti.webp", alt: "Živo rožnat trajni lak na kratkih zaobljenih nohtih" },
    { src: "/gallery/prstani.webp", alt: "Črno-bel posnetek urejene roke s prstani" },
];

/** Photo of Karin used by the About section. */
export const KARIN_PORTRAIT = {
    src: "/gallery/karin.webp",
    alt: "Karin, lastnica in kozmetičarka salona Lepotilnica by Karin, v svojem salonu v Ljubljani",
} as const;
