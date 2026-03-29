import imgBanner from "figma:asset/361553e8839ad655a26a61dfd2ce5eb48495c00c.png";

function Banner() {
  return (
    <div className="absolute h-[683px] left-[67px] mix-blend-color-dodge top-[-25.29px] w-[949px]" data-name="Banner">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[99.25%] left-0 max-w-none top-[3.6%] w-full" src={imgBanner} />
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="-translate-y-1/2 absolute border border-[#3880be] border-solid h-[545px] left-[-216px] overflow-clip rounded-br-[999px] rounded-tr-[999px] top-[calc(50%+148.5px)] w-[951px]">
      <Banner />
    </div>
  );
}

function Frame1() {
  return (
    <div className="absolute content-stretch flex flex-col font-['Melodrama:Medium',sans-serif] gap-[32px] items-start leading-[81.281px] left-[60px] not-italic text-[#f4f4f4] text-[76.68px] top-[113px] tracking-[-1.5336px] w-[896.886px]">
      <p className="relative shrink-0 w-full">Precision is the Point.</p>
      <p className="relative shrink-0 w-full">Every Diamond Has 57 Facets.</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute content-stretch flex flex-col font-['Google_Sans_17pt:Regular',sans-serif] gap-[47px] items-start leading-[27.75px] left-[855px] not-italic text-[#9ba2ad] text-[16px] top-[364px] w-[348px]">
      <p className="relative shrink-0 w-full">{`57 Facets is a private B2B jewellery platform built for the world's most discerning diamond traders, curators, and luxury maisons. We exist at the intersection of gemological precision and modern commerce — offering certified natural diamonds, rare coloured stones, and bespoke jewellery through an exclusive network of verified partners.`}</p>
      <p className="relative shrink-0 w-full">Our inventory is not for everyone. It is for those who understand that true value lies in the detail — in the cut grade, the clarity map, the symmetry of light passing through a perfectly formed stone. Every piece in our catalogue has been personally vetted, graded by internationally recognised bodies, and curated for partners who expect nothing less than the finest.</p>
    </div>
  );
}

export default function AboutSection() {
  return (
    <div className="bg-[#0a0c10] relative size-full" data-name="AboutSection">
      <Frame />
      <Frame1 />
      <Frame2 />
    </div>
  );
}