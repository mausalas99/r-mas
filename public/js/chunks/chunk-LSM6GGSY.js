import{Fb as t,K as q,Re as v,Se as y,ef as W,le as D}from"/js/chunks/chunk-IWO2N7W3.js";import{b as I}from"/js/chunks/chunk-KVCGO4KM.js";import{a as u,b,c as _,e as U,f as A,g as B,h as C,i as T,j as h,k as H,l as m,n as E,p as $,q as w}from"/js/chunks/chunk-VYF2YG7V.js";function ne(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function F(e,n="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,n)}function ae(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function ie(e){return ae(e).replace(/"/g,"&quot;")}function te(e){return`local_${String(e||"").replace(/[^a-z0-9]/gi,"").toLowerCase().slice(-10)||"device"}`.slice(0,32)}function N(e){e.innerHTML=`
      <h3 class="clinical-onboarding-title">\xBFC\xF3mo usar\xE1s R+?</h3>
      <p class="clinical-teams-lead">Elige antes de configurar tu perfil. La elecci\xF3n queda guardada en este equipo.</p>
      <div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">
        <button type="button" class="clinical-onboard-mode-card" data-sync-mode="lan">
          <span class="clinical-onboard-mode-card-title">Guardia en red (LAN)</span>
          <span class="clinical-onboard-mode-card-desc">Usuario @usuario, sala, sincronizaci\xF3n en vivo con el equipo y <strong>Mi rotaci\xF3n</strong>.</span>
        </button>
        <button type="button" class="clinical-onboard-mode-card clinical-onboard-mode-card--muted" data-sync-mode="local">
          <span class="clinical-onboard-mode-card-title">Solo este equipo</span>
          <span class="clinical-onboard-mode-card-desc">Sin LAN ni LiveSync: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.</span>
        </button>
      </div>`}function z(e,n){let a=String(n.clinicalRank||t.user?.rank||"R1"),r=String(n.clinicalDisplayName||t.user?.clinical_name||"");e.innerHTML=`
      <h3 class="clinical-onboarding-title">Perfil local</h3>
      <p class="clinical-teams-lead">R+ no usar\xE1 red de guardia. Solo necesitamos c\xF3mo firmar notas y documentos en esta Mac.</p>
      <form id="clinical-onboard-local-form" class="clinical-teams-create-form clinical-onboard-form clinical-onboard-form--local">
        <div class="field-group">
          <label for="onboard-local-name">Tu nombre en notas *</label>
          <input id="onboard-local-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
            value="${ie(r)}" required autocomplete="name">
        </div>
        <div class="field-group">
          <label for="onboard-local-rank">Rango (opcional)</label>
          <select id="onboard-local-rank" class="profile-input">
            <option value="R1" ${a==="R1"?"selected":""}>R1</option>
            <option value="R2" ${a==="R2"?"selected":""}>R2</option>
            <option value="R3" ${a==="R3"?"selected":""}>R3</option>
            <option value="R4" ${a==="R4"?"selected":""}>R4</option>
          </select>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Continuar sin LAN</button>
          <button type="button" id="clinical-onboard-back-mode" class="btn-med-secondary">Cambiar modo</button>
        </div>
      </form>`}async function P(){let{refreshMainClinicalOnboardingIfNeeded:e}=await import("/js/chunks/clinical-onboarding-main-VM2UQ4XF.js");await e()}async function re(e){if(e==="local")h(!0);else if(e==="lan")h(!1);else return;await P()}async function oe(){let e=m();delete e.clinicalLocalOnly;try{localStorage.setItem("rpc-settings",JSON.stringify(e))}catch{}await P()}async function le(e){e.preventDefault();let n=String(document.getElementById("onboard-local-name")?.value||"").trim(),a=String(document.getElementById("onboard-local-rank")?.value||"R1"),r=document.getElementById("onboard-error");if(!n){r&&(r.textContent="Escribe c\xF3mo quieres aparecer en notas y documentos.",r.hidden=!1);return}let o=ne(),i=String(t.user?.user_id||"");if(!i||!o){F("Sesi\xF3n cl\xEDnica no disponible.","error");return}let s=te(i);if(u(t.user?.username||"")!==s&&typeof o.dbClinicalUsernameClaim=="function"){let l=await o.dbClinicalUsernameClaim({userId:i,username:s});if(!l?.ok&&!/ya está en uso/i.test(String(l?.error||""))){r&&(r.textContent=l?.error||"No se pudo guardar el perfil local.",r.hidden=!1);return}l?.ok&&t.user&&(t.user.username=s)}if(typeof o.dbClinicalProfileUpsert=="function"){let l=await o.dbClinicalProfileUpsert({userId:i,clinicalName:n,rank:a,sala:null,isProgramAdmin:!1});if(!l?.ok){r&&(r.textContent=l?.error||"No se guard\xF3 el perfil.",r.hidden=!1);return}t.user&&(t.user.rank=a,t.user.clinical_name=n,t.user.sala=null,t.user.is_program_admin=0)}w({userId:i,username:s,displayName:n,rank:a,sala:"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1}),h(!0),r&&(r.hidden=!0),await y(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed")),F("Listo. R+ queda solo en este equipo, sin sincronizaci\xF3n LAN.","success"),await P()}function G(){let e=document.querySelector(".clinical-onboard-mode-grid");e&&!e._rpcModeWired&&(e._rpcModeWired=!0,e.addEventListener("click",r=>{let o=r.target.closest("[data-sync-mode]");o&&re(String(o.getAttribute("data-sync-mode")||""))}));let n=document.getElementById("clinical-onboard-local-form");n&&!n._rpcLocalWired&&(n._rpcLocalWired=!0,n.addEventListener("submit",r=>void le(r)));let a=document.getElementById("clinical-onboard-back-mode");a&&!a._rpcBackModeWired&&(a._rpcBackModeWired=!0,a.addEventListener("click",()=>void oe()))}function se(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function f(e,n="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,n)}function S(){try{let e=JSON.parse(localStorage.getItem("rpc-settings")||"{}");return String(e.clientId||"")}catch{return""}}function k(){let e=t.user;if(!e?.user_id||_(e.username,S()))return!0;try{let a=JSON.parse(localStorage.getItem("rpc-settings")||"{}"),r=String(a.clinicalUsername||"").trim();if(r&&!b(u(r))||r&&_(e.username,S()))return!0}catch{}let n=u(e.username||"");return!b(n)}function Me(){if(!t.user?.user_id)return!0;let e=t.teams||[];return q(e,t.user).length===0}function M(){if(!I())return!1;let e=m();return!(e.clinicalRegistered===!0||T(e))}function J(){if(!I())return!1;if(!t.user?.user_id||M())return!0;let e=m();return C(e)?e.clinicalRegistered!==!0?!0:!String(t.user?.clinical_name||"").trim():!!(E(e)||H(t.user?.username)||k()||!String(t.user?.clinical_name||"").trim()||!String(t.user?.sala||"").trim())}function ke(){return J()}function ce(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function j(e){return ce(e).replace(/"/g,"&quot;")}async function de(e){e.preventDefault();let n=u(String(document.getElementById("onboard-username")?.value||"")),a=String(document.getElementById("onboard-clinical-name")?.value||"").trim(),r=String(document.getElementById("onboard-rank")?.value||"R1"),o=String(document.getElementById("onboard-sala")?.value||"").trim(),i=document.getElementById("onboard-error");if(!b(n)){i&&(i.textContent="Usuario LAN inv\xE1lido. Usa 3\u201332 letras min\xFAsculas (a-z, 0-9, _), p. ej. drmendoza \u2014 no tu nombre en guardia.",i.hidden=!1);return}if(!a){i&&(i.textContent="Escribe tu nombre en guardia.",i.hidden=!1);return}let s=m(),c=String(t.user?.user_id||""),l=se();if(!c||!l){f("Sesi\xF3n cl\xEDnica no disponible.","error");return}let L=u(t.user?.username||"")!==n;if(L){let{assertLanRoomForUsernameRegister:d}=await import("/js/chunks/clinical-profile-lan-sync-XXX54KV4.js");await d({sala:o})}if(L&&typeof l.dbClinicalUsernameClaim=="function"){let d=await l.dbClinicalUsernameClaim({userId:c,username:n});if(d?.ok)t.user&&(t.user.username=n);else{let g=String(d?.error||"");if(/ya está en uso/i.test(g))if(u(String(s.clinicalUsername||""))===n||window.confirm(`El usuario @${n} ya est\xE1 registrado en esta base de datos.

\xBFRecuperar tu cuenta en este dispositivo?`)){let O=await v(n,s,S());if(!O.ok){i&&(i.textContent=O.error||g,i.hidden=!1);return}c=String(t.user?.user_id||""),s=m()}else{i&&(i.textContent=g,i.hidden=!1);return}else{i&&(i.textContent=g||"No se pudo registrar el usuario.",i.hidden=!1);return}}}if(typeof l.dbClinicalProfileUpsert=="function"){let d=await l.dbClinicalProfileUpsert({userId:c,clinicalName:a,rank:r,sala:o||null,isProgramAdmin:!1});if(!d?.ok){i&&(i.textContent=d?.error||"No se guard\xF3 el perfil.",i.hidden=!1);return}t.user&&(t.user.rank=r,t.user.clinical_name=a,t.user.sala=o||null,t.user.is_program_admin=0)}w({userId:c,username:n,displayName:a,rank:r,sala:o||"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1});let x=String(document.getElementById("onboard-shift-pin")?.value||"").trim();if(x&&!C()){let{connectLanWithShiftPin:d}=await import("/js/chunks/lan-shift-pin-connect-V25RVIUL.js");await d(x,{sala:o})||f("No se encontr\xF3 anfitri\xF3n con ese PIN del turno. Revisa Wi\u2011Fi o pide un PIN nuevo al R4.","warning")}i&&(i.hidden=!0),await y(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));let{flushClinicalProfileToLan:V,LAN_PROFILE_PUSH_FAILED_MSG:Y,LAN_PROFILE_NEEDS_CONNECT_MSG:K,isBenignLanPushSkipCode:Q,isLanProfileNeedsConnectCode:X,notifyLanProfilePushResult:Z}=await import("/js/chunks/clinical-profile-lan-sync-XXX54KV4.js"),p=await V({sala:o||t.user?.sala});if(Z(p,f),!C()&&!p.ok&&X(p.code)){f(K,"info"),(await import("/js/chunks/clinical-rotation-entry-7ZJ3HIWZ.js")).syncClinicalRotationEntryChrome();let{refreshMainClinicalOnboardingIfNeeded:g}=await import("/js/chunks/clinical-onboarding-main-VM2UQ4XF.js");await g();return}!p.ok&&!Q(p.code)&&!(p.channels&&p.channels.outbox)?f(Y,"warning"):p.ok&&L?f("Perfil guardado y @usuario publicado en la sala \u21C4.","success"):f("Perfil guardado. Abre Mi rotaci\xF3n cuando quieras buscar equipos o crear el tuyo.","success");let{refreshMainClinicalOnboardingIfNeeded:ee}=await import("/js/chunks/clinical-onboarding-main-VM2UQ4XF.js");await ee()}async function ue(){let e=u(String(document.getElementById("onboard-username")?.value||"")),n=document.getElementById("onboard-error"),a=document.getElementById("clinical-onboard-resume-btn");if(!b(e)){n&&(n.textContent="Escribe tu usuario LAN para recuperarlo.",n.hidden=!1);return}a instanceof HTMLButtonElement&&(a.disabled=!0,a.textContent="Recuperando\u2026");let r=m();try{let o=await v(e,r,S());if(!o.ok){n&&(n.textContent=o.error||"No se pudo recuperar la cuenta.",n.hidden=!1);return}if(n&&(n.hidden=!0),f("Cuenta recuperada.","success"),await y(),!k()){let{refreshMainClinicalOnboardingIfNeeded:s}=await import("/js/chunks/clinical-onboarding-main-VM2UQ4XF.js");await s();return}f("Completa tu perfil y pulsa Continuar.","info");let{refreshMainClinicalOnboardingIfNeeded:i}=await import("/js/chunks/clinical-onboarding-main-VM2UQ4XF.js");await i()}finally{a instanceof HTMLButtonElement&&(a.disabled=!1,a.textContent="Recuperar mi usuario")}}async function R(){G();let e=document.getElementById("clinical-onboard-username-form");e&&!e._rpcOnboardWired&&(e._rpcOnboardWired=!0,e.addEventListener("submit",a=>void de(a)));let n=document.getElementById("clinical-onboard-resume-btn");n&&!n._rpcResumeWired&&(n._rpcResumeWired=!0,n.addEventListener("click",()=>void ue()))}async function xe(){await D(async e=>{await me(e)})}async function me(e){if(!String(t.user?.user_id||"")){if(M()){N(e),await R();return}let{buildOnboardingSessionBlockHtml:i}=await import("/js/chunks/clinical-onboarding-main-VM2UQ4XF.js");e.innerHTML=await i();return}await W();let a=$(m()),r=E(a),o=r?"":u(String(a.clinicalUsername||""));if(!r&&k()&&o&&b(o))try{await v(o,a,S()),await y(),a=m()}catch{}if(!J()){let{hideMainClinicalOnboarding:i}=await import("/js/chunks/clinical-onboarding-main-VM2UQ4XF.js");if(i(),e.closest("#clinical-teams-panel-body")){let{renderClinicalTeamsPanel:s}=await import("/js/chunks/clinical-teams-TLYBAIGJ.js");await s()}return}if(M()){N(e),await R();return}if(C(a)){z(e,a),await R();return}{let i=String(a.clinicalRank||t.user?.rank||"R1"),s=r?"":String(a.clinicalDisplayName||t.user?.clinical_name||""),c=String(a.clinicalSala||t.user?.sala||""),l=r?`<p class="clinical-teams-lead clinical-onboard-gate-lead">${U}</p>`:'<p class="clinical-teams-lead">Confirma tu usuario LAN, nombre en guardia, rango y sala. Para equipos, abre <strong>Mi rotaci\xF3n</strong> despu\xE9s.</p>';e.innerHTML=`
      <h3 class="clinical-onboarding-title">Configura tu rotaci\xF3n</h3>
      <h4 class="clinical-teams-section-title">Usuario y nombre en guardia</h4>
      ${l}
      <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
        <div class="field-group">
          <label for="onboard-username">Usuario LAN (@usuario) *</label>
          <input id="onboard-username" type="text" class="profile-input" placeholder="ej. drmendoza"
            value="${j(o)}" required autocomplete="off" spellcheck="false">
          <p class="clinical-teams-hint">${A}</p>
        </div>
        <div class="field-group">
          <label for="onboard-clinical-name">Nombre en guardia *</label>
          <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
            value="${j(s)}" required autocomplete="name">
          <p class="clinical-teams-hint">${B}</p>
        </div>
        <div class="field-group">
          <label for="onboard-rank">Rango</label>
          <select id="onboard-rank" class="profile-input">
            <option value="R1" ${i==="R1"?"selected":""}>R1</option>
            <option value="R2" ${i==="R2"?"selected":""}>R2</option>
            <option value="R3" ${i==="R3"?"selected":""}>R3</option>
            <option value="R4" ${i==="R4"?"selected":""}>R4</option>
          </select>
        </div>
        <div class="field-group">
          <label for="onboard-sala">Sala *</label>
          <select id="onboard-sala" class="profile-input" required>
            <option value="">\u2014 Seleccionar \u2014</option>
            <option value="Sala 1" ${c==="Sala 1"?"selected":""}>Sala 1</option>
            <option value="Sala 2" ${c==="Sala 2"?"selected":""}>Sala 2</option>
            <option value="Sala E" ${c==="Sala E"?"selected":""}>Sala E</option>
          </select>
        </div>
        <div class="field-group">
          <label for="onboard-shift-pin">PIN del turno (\u21C4)</label>
          <input id="onboard-shift-pin" type="text" class="profile-input" inputmode="numeric"
            pattern="[0-9]{6}" maxlength="6" placeholder="6 d\xEDgitos del anfitri\xF3n" autocomplete="off">
          <p class="clinical-teams-hint">6 d\xEDgitos del anfitri\xF3n (\u21C4). R+ conecta solo; si cambias de Wi\u2011Fi, vuelve a usar el mismo PIN.</p>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Guardar perfil</button>
          <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
        </div>
      </form>`,await R()}}export{N as a,G as b,k as c,Me as d,M as e,J as f,ke as g,xe as h,me as i};
//# sourceMappingURL=/js/chunks/chunk-LSM6GGSY.js.map
