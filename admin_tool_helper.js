// ==UserScript==
// @name         Appvizer Helper
// @namespace    https://appvizer.fr
// @version      2024-08-16
// @description  Admin tool
// @author       Appvizer Engineering
// @match        https://appvizer.fr/*
// @match        https://fr.sandbox.appvizer.net/*
// @match        https://www.appvizer.fr/*
// @match        https://appvizer.com/*
// @match        https://www.appvizer.com/*
// @match        https://appvizer.es/*
// @match        https://www.appvizer.es/*//
// @match        https://appvizer.de/*
// @match        https://www.appvizer.de/*
// @match        https://appvizer.it/*
// @match        https://www.appvizer.it/*
// @match        https://appvizer.co.uk/*
// @match        https://www.appvizer.co.uk/*
// @match        https://appvizer.com.br/*
// @match        https://www.appvizer.com.br/*
// @homepageURL  https://gist.github.com/cloud-is-mine/8c967ff4035f171dbfb8d12d6b7ce9a7
// @grant        none
// ==/UserScript==


const apiCall = async (query) => {
    // todo manage env
    const res = await fetch('https://api.appvizer.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query
        })
    });
    if (res.status !== 200) {
        const error = await res
            .json()
            .then((err) => {
                if (!err.errors) {
                    return undefined;
                }

                return err.errors[0]?.message;
            })
            .catch(() => undefined);

        throw new Error(
            `Public API (${this.config.url}) did not respond with a status 200, it responded with ${res.status}: ${res.statusText}${error ? ` (${error})` : ''}`
        );
    }

    const json = await res.json();

    if (!json.data) {
        throw new Error(
            `Public API (${this.config.url}) did not respond a response with a valid "data" in it`
        );
    }

    return json.data;
}


const getDomainOrThrow = () => {
    const domain = document.querySelector('meta[name=tech-domain]')?.getAttribute('content');
    if (!domain) {
        throw new Error(`Can't retrieve domain`)
    }
    return domain;
}

const refreshCache = async () => {
    try {
        await fetch(`https://${location.hostname}/api/backoffice/render-cache/refresh-pattern?pattern=${location.pathname}&domainId=${getDomainOrThrow()}`);
        location.reload();
    } catch (err) {
        console.error(err);
    }
}

const checkUser = async () => {
    try {
        const loggedUserRes = await fetch(`https://${location.hostname}/rest/user/me`, {
            credentials: "include"
        })
        const loggedUser = await loggedUserRes.json();
        return loggedUser.role === 'ADMIN'
    } catch (err) {
        console.error("Error fetching user status:", err);
        return false;
    }
}

const createButton = (parent, name, action) => {
    const buttonEl = document.createElement('button');
    buttonEl.innerText = name;
    buttonEl.classList.add('secondary')
    buttonEl.addEventListener('click', action);
    parent.appendChild(buttonEl);
}

const buildMenu = async () => {
    const isAdmin = await checkUser();
    // const isVenus = !!document.querySelector('#serverApp-state');
    // if (isVenus) {
    //     return;
    // }
    if (!isAdmin) {
        console.log('To perform admin operations, you need to log in');
        return;
    }



    const buildArticleMenu = async (menuEl) => {
        createRefreshCacheButton(menuEl);
        const articleId = document.querySelector('meta[name=appvizer-article-id]')?.getAttribute('content');
        if (!articleId) {
            return
        }
        const query = `{
                            articleById(domain: FR, id: "${articleId}") {
                                administrationUrl
                            }
                        }`
        const res = await apiCall(query)
        if (!res.articleById?.administrationUrl) {
            return
        }



        createEditInDatoButton(menuEl, res.articleById.administrationUrl)
    }

    const buildHomeMenu = async (menuEl) => {
        createRefreshCacheButton(menuEl);
        const query = `{
                            home(domain: FR) {
                                administrationUrl
                            }
                        }`
        const res = await apiCall(query)
        if (!res.home?.administrationUrl) {
            return
        }



        createEditInDatoButton(menuEl, res.home.administrationUrl)

    }

    const buildCategoryMenu = async (menuEl) => {
        createRefreshCacheButton(menuEl);
        const gcId = document.querySelector('meta[name=appvizer-gc-id]')?.getAttribute('content');
        const scId = document.querySelector('meta[name=appvizer-sc-id]')?.getAttribute('content');
        const categoryId = scId || gcId;
        if (!categoryId) {
            return
        }
        const query = `{
                            magazineCategory(domain: FR, categoryId: "${categoryId}") {
                                administrationUrl
                            }
                        }`
        const res = await apiCall(query)
        if (!res.magazineCategory?.administrationUrl) {
            return
        }

        createEditInDatoButton(menuEl, res.magazineCategory?.administrationUrl)
    }

    const createRefreshCacheButton = async (menuEl) => {
        createButton(menuEl, 'Refresh Cache', refreshCache)
    }

    const createEditInDatoButton = async (menuEl, url) => {
        createButton(menuEl, 'Edit in Dato >', () => window.open(url, '_blank'));
    }

    const pageType = document.querySelector('meta[name=appvizer-page-type]')?.getAttribute('content')
    const menuEl = document.createElement('div');
    menuEl.classList.add('admin-pannel');
    menuEl.style.position = 'fixed';
    menuEl.style.right = '10px';
    menuEl.style.bottom = '10px';
    menuEl.style.zIndex = '10';
    menuEl.style.display = 'flex';
    menuEl.style.flexDirection = 'column';
    menuEl.style.gap = '5px';

    switch (pageType) {
        case 'Article':
        case 'News':
            await buildArticleMenu(menuEl)
            break;
        case 'Home':
            await buildHomeMenu(menuEl);
            break;
        case 'Category':
            await buildCategoryMenu(menuEl);
            break;
        default:
            createRefreshCacheButton(menuEl);
            break;
    }
    document.body.appendChild(menuEl)
}


buildMenu();
