import {useNavigate, useSearchParams} from "react-router-dom";
import {useDispatch, useSelector} from "react-redux";
import {useEffect, useState} from "react";
import Toolbar from "./toolbar";
import {setRecipes} from "../redux/recipeSlice";

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const API_KEY = process.env.REACT_APP_API_KEY;
// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
// const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

const LoginPage = () => {
    const navigate = useNavigate();
    let [searchParams, setSearchParams] = useSearchParams();
    const recipes = useSelector((state) => state.recipes);
    const [isLoggedIn, setLoggedIn] = useState(false);
    const [isGAPIInited, setGAPIInited] = useState(false);
    const [isGISInited, setGISInited] = useState(false);
    const [tokenClient, setTokenClient] = useState(undefined);
    const dispatch = useDispatch();


    useEffect(() => {
        setLoggedIn(recipes.recipesLoaded);
    }, [recipes]);


    useEffect(() => {
        if (!isGAPIInited) {
            window.gapi.load('client', initializeGapiClient);
        } else if (!isGISInited) {
            gisLoaded();
        }
    }, [isGAPIInited, isGISInited]);

    /**
     * Callback after the API client is loaded. Loads the
     * discovery doc to initialize the API.
     */
    const initializeGapiClient = async () => {
        await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
        setGAPIInited(true);
    };

    /**
     * Callback after Google Identity Services are loaded.
     */
    const gisLoaded = () => {
        const token = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // defined later
        });
        setTokenClient(token);
        setGISInited(true);
    };

    /**
     *  Sign in the user upon button click.
     */
    const logIn = () => {
        let token = tokenClient;
        token.callback = async (resp) => {
            if (resp.error !== undefined) {
                console.log("welp this blew up");
                throw (resp);
            }
            await saveRecipes();
            setLoggedIn(true);
        };

        if (window.gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            // when establishing a new session.
            token.requestAccessToken({prompt: 'consent'});
        } else {
            // Skip display of account chooser and consent dialog for an existing session.
            token.requestAccessToken({prompt: ''});
        }
    }

    /**
     *  Sign out the user upon button click.
     */
    const logOut = () => {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token);
            window.gapi.client.setToken('');
        }
        setLoggedIn(false);
        dispatch(setRecipes([]));
    };

    const saveRecipes = async () => {
        window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: '11C_U7Xm2X43oT30uS2T4-T8HcrNLvfW-mYZKuhqEzNg',
            range: 'recipeServerSpreadsheet!A2:E'
        })
            .then((response) => {
                const range = response.result;
                if (!range || !range.values || range.values.length === 0) {
                    console.log('No values found.');
                    return;
                }

                // Flatten to string to display
                let recipeArr = [];
                let counter = 0;
                for (const value of range.values) {
                    recipeArr.push({
                        id: counter++,
                        title: value[0],
                        contributor: value[1],
                        category: value[2],
                        ingredients: value[3],
                        directions: value[4]
                    })
                }
                dispatch(setRecipes(recipeArr));
                navigateToIntendedPage();
            }).catch(() => {
            alert("You do not have access to the spreadsheet. Ask Caleb for access");
        })
    };

    const navigateToIntendedPage = () => {
        const pathName = searchParams.get("pathName");
        const navigatePath = "/recipes" + (pathName ? "/" + pathName : "");
        navigate(navigatePath);
    }

    return (
        <div>
            <Toolbar/>
            <br/>
            <h1 className='center'>Authenticate With Google</h1>
            {isGAPIInited && isGISInited ?

                <div className={'center'}>
                    {isLoggedIn ? (
                        <button className={'loginButton'} onClick={logOut}>Logout</button>
                    ) : (
                        <button className={'loginButton'} onClick={logIn}>Login</button>
                    )
                    }
                </div>

                : <div className="centerBlock">
                    <div className="loader"></div>
                </div>
            }
        </div>
    );
};

export default LoginPage;