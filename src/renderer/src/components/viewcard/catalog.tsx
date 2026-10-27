import type { ReactNode } from 'react'
import { AlbumRail } from './AlbumRail'
import { CustomCursor } from './CustomCursor'
import { DepthCard } from './DepthCard'
import { DepthRibbon } from './DepthRibbon'
import { ElasticReel } from './ElasticReel'
import { ElasticSticker } from './ElasticSticker'
import { LenticularCarousel } from './LenticularCarousel'
import { ParallaxPills } from './ParallaxPills'
import { RotatingCards } from './RotatingCards'
import { ScrollBend } from './ScrollBend'
import { ShaderCard } from './ShaderCard'
import { TextPath } from './TextPath'
import { SAMPLES } from './shared'

export type ViewCardCategory = '3D & Shaders' | 'Galleries' | 'Text & Cursor'

export interface ViewCardEntry {
  id: string
  name: string
  category: ViewCardCategory
  /** The React Bits Pro component this one is modelled on. */
  inspiredBy: string
  description: string
  goodFor: string
  /** Shown over the preview: how to play with it. */
  tryIt: string
  /** `big` is true in the full-size view, where wheel scrolling is handed to the component. */
  render: (big: boolean) => ReactNode
}

export const VIEW_CARDS: ViewCardEntry[] = [
  {
    id: 'rotating-cards',
    name: 'Rotating Cards',
    category: '3D & Shaders',
    inspiredBy: 'Rotating Cards',
    description: 'A ring of cards turning in 3D. Cards facing away fade, so the ring reads as depth.',
    goodFor: 'a team, a product range, or 6–12 short items to show at once.',
    tryIt: 'Drag to spin · click a card',
    render: (big) => <RotatingCards radius={big ? 360 : 230} cardWidth={big ? 160 : 110} cardHeight={big ? 200 : 140} mouseWheel={big} />
  },
  {
    id: 'shader-card',
    name: 'Shader Card',
    category: '3D & Shaders',
    inspiredBy: 'Shader Card',
    description: 'A content card with a live WebGL flame rising behind the text. Hover to tilt it and stoke the flame.',
    goodFor: 'a hero offer, a pricing plan, or one key message that needs to glow.',
    tryIt: 'Hover over the card',
    render: (big) => (
      <ShaderCard width={big ? 360 : 240} height={big ? 460 : 300}>
        <h3>Lawnak Pro</h3>
        <p>Decks that move. Shaders, 3D and motion, ready for your next pitch.</p>
        <span className="vc-shader-cta">Get started →</span>
      </ShaderCard>
    )
  },
  {
    id: 'depth-ribbon',
    name: 'Depth Ribbon',
    category: '3D & Shaders',
    inspiredBy: 'Depth Ribbon',
    description: 'Image cards wind along a 3D path while the camera rides it, then pulls back to show the whole shape.',
    goodFor: 'big image collections, portfolios, or an opening "wow" slide.',
    tryIt: 'Click a card · press and hold · drag',
    render: (big) => <DepthRibbon count={big ? 72 : 44} wheel={big} />
  },
  {
    id: 'album-rail',
    name: 'Album Rail',
    category: 'Galleries',
    inspiredBy: 'Album Rail',
    description: 'A fanned row of album sleeves. The centre record slides out and spins when you play it.',
    goodFor: 'case studies, chapters, releases, or anything with a cover and a title.',
    tryIt: 'Drag · click the centre cover',
    render: (big) => <AlbumRail wheel={big} size={big ? 0.62 : 0.66} />
  },
  {
    id: 'elastic-reel',
    name: 'Elastic Reel',
    category: 'Galleries',
    inspiredBy: 'Elastic Reel',
    description: 'Thin photo slices that bulge around the pointer like a dock, and swell open into a full photo.',
    goodFor: 'a compact photo gallery or a "pick one" chooser.',
    tryIt: 'Hover · click a bar · click again to close',
    render: (big) => <ElasticReel wheel={big} barWidth={big ? 44 : 22} gap={big ? 10 : 6} magnify={big ? 2.4 : 2} influence={big ? 200 : 90} />
  },
  {
    id: 'elastic-sticker',
    name: 'Elastic Sticker',
    category: '3D & Shaders',
    inspiredBy: 'Elastic Sticker',
    description: 'Stickers you can pick up and throw. They lift, lean with speed, wobble to a stop, and peel at the corner.',
    goodFor: 'playful slides, badges, awards, or brand stickers.',
    tryIt: 'Drag a sticker · hover a corner',
    render: (big) => {
      const s = big ? 220 : 130
      return (
        <div className="vc-sticker-area">
          <ElasticSticker src={SAMPLES[1].src} width={s} finish="gloss" rotation={-6} style={{ left: '12%', top: '22%' }} />
          <ElasticSticker src={SAMPLES[3].src} width={s} finish="holo" rotation={5} style={{ left: '40%', top: '30%' }} />
          <ElasticSticker src={SAMPLES[8].src} width={s * 0.85} radius={s} finish="matte" rotation={10} style={{ left: '68%', top: '18%' }} />
        </div>
      )
    }
  },
  {
    id: 'scroll-bend',
    name: 'Scroll Bend',
    category: 'Galleries',
    inspiredBy: 'Scroll Bend',
    description: 'A strip of images that swells or pinches like a lens as it scrolls, with a little colour fringing.',
    goodFor: 'a scrolling story, a timeline of images, or a moodboard.',
    tryIt: 'Drag up and down fast',
    render: (big) => <ScrollBend wheelSpeed={big ? 1 : 0} itemSize={big ? 0.62 : 0.7} />
  },
  {
    id: 'depth-card',
    name: 'Depth Card',
    category: '3D & Shaders',
    inspiredBy: 'Depth Card',
    description: 'A card that tilts toward the cursor while its layers float apart, with a spotlight that follows you.',
    goodFor: 'feature cards, profiles, or product shots.',
    tryIt: 'Move over the card',
    render: (big) => <DepthCard width={big ? 320 : 210} height={big ? 430 : 280} />
  },
  {
    id: 'lenticular-carousel',
    name: 'Lenticular Carousel',
    category: 'Galleries',
    inspiredBy: 'Lenticular Carousel',
    description: 'Portrait slides printed like lenticular cards. Hover one and it flips, rib by rib, to a second picture.',
    goodFor: 'before / after, two sides of a story, or product variants.',
    tryIt: 'Move across the centre slide',
    render: (big) => <LenticularCarousel cardWidth={big ? 260 : 160} strips={big ? 48 : 28} />
  },
  {
    id: 'text-path',
    name: 'Text Path',
    category: 'Text & Cursor',
    inspiredBy: 'Text Path',
    description: 'Text that runs along a curved line forever. Comes with wave, circle, loop and arch paths.',
    goodFor: 'a slogan, a section divider, or a badge around a logo.',
    tryIt: 'Just watch',
    render: (big) => (
      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', padding: big ? 40 : 16, boxSizing: 'border-box' }}>
        <TextPath text="LAWNAK VISION • DECKS THAT MOVE • " path="wave" fontSize={big ? '30px' : '22px'} letterSpacing="2px" duration={18} showPath />
      </div>
    )
  },
  {
    id: 'custom-cursor',
    name: 'Custom Cursor',
    category: 'Text & Cursor',
    inspiredBy: 'Custom Cursor',
    description: 'A ring and dot that follow the pointer on springs. Over a target the ring wraps around it and can show a picture.',
    goodFor: 'interactive menus, portfolios, or making links feel alive.',
    tryIt: 'Move the pointer in here',
    render: () => (
      <CustomCursor targets={['.vc-cursor-tile', '.vc-cursor-link']} images={[SAMPLES[2].src]} elastic targetPadding={6}>
        <div className="vc-cursor-demo">
          <span className="vc-cursor-link">Hover me</span>
          <div className="vc-cursor-tiles">
            <span className="vc-cursor-tile">Work</span>
            <span className="vc-cursor-tile">About</span>
            <span className="vc-cursor-tile">Contact</span>
          </div>
          <p>The ring wraps around each target.</p>
        </div>
      </CustomCursor>
    )
  },
  {
    id: 'parallax-pills',
    name: 'Parallax Pills',
    category: 'Text & Cursor',
    inspiredBy: 'Parallax Pills',
    description: 'Labelled pills drop in with a springy bounce, some swinging on a hinge, then drift with the cursor.',
    goodFor: 'keywords, services, skills, or tags on a title slide.',
    tryIt: 'Move the pointer · Restart to replay',
    render: (big) => <ParallaxPills height="100%" pillHeight={big ? 72 : 48} fontSize={big ? 20 : 15} disableEmptyPills={false} />
  }
]
