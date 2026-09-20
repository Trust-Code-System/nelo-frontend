import Image from 'next/image';

function LogoFace({ inverse }: { inverse: boolean }) {
  return (
    <Image
      src={inverse ? '/brand/nelo-logo-white.png' : '/brand/nelo-logo-black.png'}
      alt=""
      width={577}
      height={266}
      sizes="(max-width: 640px) 91px, 260px"
      priority
    />
  );
}

/** The original NELO WOMAN artwork from the live storefront. */
export function NeloWord({
  rolling = false,
  inverse = false,
}: {
  rolling?: boolean;
  inverse?: boolean;
}) {
  return (
    <span className="nelo-word" aria-hidden="true">
      {rolling ? (
        <span className="nelo-word__rail">
          <span><LogoFace inverse={inverse} /></span>
          <span><LogoFace inverse={inverse} /></span>
        </span>
      ) : (
        <span className="nelo-word__single"><LogoFace inverse={inverse} /></span>
      )}
    </span>
  );
}
