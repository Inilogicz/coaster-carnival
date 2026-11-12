'use client';

export function ErrorScreen({ notFound = false, reset, admin = false }: { notFound?: boolean; reset?: () => void; admin?: boolean }) {
  const home = admin ? '/admin' : '/';
  return <main className="cc-error-page">
    <style>{`
      .cc-error-page{min-height:100svh;box-sizing:border-box;margin:0;padding:36px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at top left,#d5eee6,transparent 65%),#f0f6f4;color:#123e49;font-family:Arial,Helvetica,sans-serif;text-align:center}
      .cc-error-brand{color:#073e59;text-decoration:none;font-size:11px;letter-spacing:3px;font-weight:800;margin-bottom:30px}
      .cc-error-card{box-sizing:border-box;width:100%;max-width:540px;border:1px solid #d8e7e1;border-radius:24px;background:white;overflow:hidden;box-shadow:0 20px 60px #073e5910}
      .cc-error-art{padding:32px 20px 24px;background:#073e59;position:relative;color:#aee6d5}
      .cc-error-code{display:block;font-size:88px;line-height:1;font-weight:900;letter-spacing:-6px}
      .cc-error-wave{display:block;margin:16px auto 0;width:150px;height:20px;color:#6ac8bc}
      .cc-error-content{padding:30px}
      .cc-error-label{font-size:10px;font-weight:700;letter-spacing:2px;color:#087f83;margin:0 0 12px}
      .cc-error-content h1{font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-1px;margin:0 0 14px;color:#073e59}
      .cc-error-copy{color:#5c7470;font-size:14px;line-height:1.8;margin:0 0 24px}
      .cc-error-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
      .cc-error-actions a,.cc-error-actions button{box-sizing:border-box;border:1px solid #073e59;border-radius:8px;padding:14px 20px;text-decoration:none;font-size:13px;line-height:1.3;font-weight:700;font-family:inherit;cursor:pointer;background:#073e59;color:white}
      .cc-error-actions .cc-error-secondary{background:white;color:#073e59;border-color:#cbded8}
      .cc-error-actions a:hover,.cc-error-actions button:hover{filter:brightness(.92)}
      .cc-error-page a:focus-visible,.cc-error-page button:focus-visible{outline:3px solid #4abbbd;outline-offset:4px}
      .cc-error-hint{border-top:1px solid #e5eeea;margin:25px 0 0;padding-top:18px;font-size:12px;line-height:1.7;color:#6b817b}
      .cc-error-signoff{font-size:9px;letter-spacing:2px;color:#65857c;margin:26px 0 0}
      @media(max-width:480px){.cc-error-content{padding:26px 22px}.cc-error-content h1{font-size:26px}.cc-error-actions{flex-direction:column}.cc-error-code{font-size:76px}}
    `}</style>
    <a className="cc-error-brand" href={home}>THE WILDLINGS HUB</a>
    <section className="cc-error-card" aria-labelledby="cc-error-title">
      <div className="cc-error-art" aria-hidden="true">
        <span className="cc-error-code">{notFound ? '404' : 'Oops.'}</span>
        <svg className="cc-error-wave" viewBox="0 0 150 20" fill="none"><path d="M2 10Q14-4 26 10T50 10T74 10T98 10T122 10T146 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
      </div>
      <div className="cc-error-content">
        <p className="cc-error-label">{notFound ? 'A LITTLE OFF COURSE' : 'A BUMP ALONG THE WAY'}</p>
        <h1 id="cc-error-title">{notFound ? 'This page drifted away.' : 'Something went wrong.'}</h1>
        <p className="cc-error-copy">{notFound ? 'We couldn’t find this page. The link may be incorrect, expired, or no longer available. Let’s get you back.' : 'We couldn’t load this page just now. Give it another try, or head back and continue from there.'}</p>
        <div className="cc-error-actions">
          {!notFound && <button type="button" onClick={() => reset ? reset() : window.location.reload()}>Try again</button>}
          <a className={!notFound ? 'cc-error-secondary' : undefined} href={home}>{admin ? 'Back to dashboard' : 'Back to the carnival'} <span aria-hidden="true">↗</span></a>
        </div>
        <p className="cc-error-hint">{notFound ? 'Looking for a ticket or private registration? Check the original link shared with you, or contact the organiser.' : 'If this happened after a payment, check your email before paying again. Contact the organiser if you need help.'}</p>
      </div>
    </section>
    <p className="cc-error-signoff">GOOD PEOPLE. GREAT ENERGY. ONE COAST.</p>
  </main>;
}
