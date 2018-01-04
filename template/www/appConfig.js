    /**
     * appConfig - This object is loaded from index.html when the client is starting up. It
     * determines the default values of each of its keys. Once the application
     * has loaded the values at runtime, these values are copied into AppPreferences,
     * where they can be modified by the user. From that point on, any value in AppPreferences
     * will override any value of the same key here.
     */
    fiori_client_appConfig = {
        /**
         * appID - The appID used to identify the application to the data vault.
         * If you are using SMP, this should be consistent with the appID of the
         * target application. Note that this value is distinct from the packageName,
         * which is mainly used to identify your application in app stores.
         */
        "appID": "",
        /**
         * fioriURL - The full URL of the target application. If your application does not
         * use SMP, it will navigate directly to this URL once logon is completed. If your app
         * does use SMP, this URL is parsed and used in the following way:
         *   1. The URL scheme (which must be http or https) determines the inital value
         *      of the 'https' flag for the SMP registration. Similarly, the host and port
         *      in the URL determine their corresponding initial values for the SMP registration.
         *   2. The URL suffix (everything after the host and port) is appended to the URL that
         *      the user registers to.
         * If you are using SMP, you will ultimately want to specify the scheme, host and port of
         * your SMP server, followed by the suffix of the Fiori endpoint. For example:
         *
         * "https://my.smp.server:8081/sap/bc/ui5_ui5/ui2/ushell/shells/abap/FioriLaunchpad.html"
         */
        "fioriURL": "",
        /**
         * fioriURLIsSMP - Set this to true if your are using SMP.
         * If set to true, the application will perform SMP registration.
         */
        "fioriURLIsSMP": false,

		/*
         * The preference name in config.xml for creating proxy library instance based on the platform class name
         * currently only suppported for iOS platform
		 */
        //"proxyID":"appConnectProxy",

        /*
         * The proxy library url setting
         * currently only supported by iOS platform
         */
        //"proxyURL":"https://vpn.pssso.net",
        
        /* The proxy exception list in regular expression. Any requests with matched url should be handled
         * by secure proxy library, and ignored by application connection handler. The list should include 
         * proxy URL and proxy gateway SAML IDP url.
         * Currently only supported by iOS platform
         */
         //"proxyExceptionList":["vpn.pssso.net"],


        /** 
         * multiUser - A Boolean property to set whether multi-user support is enabled.
         * If set to true, the Logon plugin will allow multiple users to register, each
         * with a different passcode, and provide a mechanism for switching between users.
         * If the properety is set to false or not specified, the Logon plugin will run in single user mode.
         * 
         * In the current release, multiUser is only supported on iOS and Windows platforms with SMP/HCPms
         * registration. The property is ignored when running on Andorid platform, or when SMP/HCPms 
         * registration is not used.
         **/
        "multiUser": false,

        /**
         * certificate - Set the client certificate provider
         * Fiori client has built-in support for afaria certificate provider. 
         *   for SMP registration, specify "afaria" as certificate provider.
         *   for no-SMP registration, specify "com.sap.afaria" as certificate provider.
         *   (On ios, "com.sap.afaria" is supported for both SMP and no-SMP registration).
         *   As afaria seeding data is not supported by fiori client, so the only use of afaria is for client certificate.
         * Certain parameters might be passed to the Certificate Providers.
         * Example:
         *      "certificate": {
         *           "id": "<<CertificateProvider>>",
         *           "config":{
         *               "property": "value", //add provider specifica key/value pairs here.
         *               ...
         *               "propertyN": "valueN"
         *           }
         *       }
         * 
         * If the third party certificate provider ID is set to "com.sap.federationprovider" a secondary certificate provider must be supplied.
         * This can be either "com.sap.afaria" or "com.sap.mobilesecure.certificateService" or any other third party provider.
         * When third party certificate provider is used, you must provide the federated_certificate property in the config JSON structure.
         *    Example:
         *      "certificate": {
         *           "id": "com.sap.federationprovider",
         *           "config":{
         *               "federated_certificate" : "<<CertificateProvider>>",
         *               "property": "value", //add provider specifica key/value pairs here.
         *               ...
         *               "propertyN": "valueN" //parameters will be also made available for the federated_certificate
         *           }
         *       }
         *
         * If a system certificate provider is required, set "certificate": "com.sap.SystemCertProvider".
         * This certificate provider is only available for Android by default. 
         */
         "certificate": "",

		 
		 /**
		 * federated_certificate - Set the embedded certicate provider
		 * If the third party certificate provider ID is set to "com.sap.federationprovider" a secondary certificate provider must be supplied.
	     * This can be either "com.sap.afaria" or "com.sap.mobilesecure.certificateService" or any other third party provider.
	 * DEPRECATED!: property for setting federated_certificate identifier will be removed! Use instead the certificate JSON structure. Please see the certificate section.
		 */
		 "federated_certificate" : "",

        /**
         * autoSelectSingleCert - The property is only supported by iOS, and mainly used for Non-SMP registration.
         * When this property is set to true, if there is only one client certificate existing in application keychain, then
         *    the xmlHttpRequest will automatically select it for any client certificate challenges. 
         * This property is not used by Android client. For Android client, the user must manually select the certificate when 
         *    it is challenged by server at the first time, after that, the application will remember the user's selection and 
         *    automatically provide the selected certificate for the same challenges 
         * Default value is false
         */
         "autoSelectSingleCert": false,
        
        /**
         * skiphomebuster - The property is used to control whether to append the "homebuster" parameter with a random value when 
         *       loading fiori home page.
         * By default when loading fiori url, the fiori client will automatically append the "homebuster" parameter with a random value.
         *       The random value is used to force webview to load the fiori url from remote server instead of from the 
         *       local cache. The skiphomebuster property can be used to disable this feature to avoid any server errors caused by the
         *       unknown "homebuster" url parameter
         * Default value is false
         */
         //"skiphomebuster": true,
        
        
         /**
	     * appName - The optional property is used for customizing the Fiori application name showing on logon screen. By default, the app name is "SAP Fiori Client" defined in resource file.
	     */
	     //"appName": "My App",
        
        /**
         * communicatorId - the communicator id for SMP/HCPms registration, default is "REST"
         */
         //"communicatorId" : "REST",
        
        /**
         * registrationServiceVersion - the registration url version for SMP/HCPms registraiton, only needed when default version used by client does not work
	 * DEPRECATED!: property for forcing registration service version will be removed
         */
         //"registrationServiceVersion" : "latest",
       
         /**
         * passcodePolicy - Specify the passcodePolicy of the data vault. Note: if you
         * are using SMP, the passcodePolicy is determined by the server.
         * For more information, see documentation of the logon plugin.
         * 
         */
         "passcodePolicy":  {
               "expirationDays":"0",
               "hasDigits":"false",
               "hasLowerCaseLetters":"false",
               "hasSpecialLetters":"false",
               "hasUpperCaseLetters":"false",
               "defaultAllowed":"true",
               "lockTimeout":"300",
               "minLength":"8",
               "minUniqueChars":"0",
               "retryLimit":"10",
               "allowFingerprint":"true"
          },

        /**
         * keysize - this is an optional argument for the AfariaCertificateProvider, to set the bit rate of the public/private keys.
         *           If this value is empty, or invalid, it will be defaulted to 2048.
         */
        "keysize": "",

        /**
         * idpLogonURL - This url is used to reload idp logon with username/passcode passed from SAP authenticator for SSO.
         */
        "idpLogonURL": "",

        /**
         * privacyPolicies - this is an optional value for the Usage plugin that can be modified to include
         * additional privacy policies in addition to the SAP Privacy Policy.
         * For more information, see documentation of the Usage plugin.
         */
        //"privacyPolicies": [
        //    {"id": "mycompany", "label": "My Company Privacy Policy", "url": "http://mycompany.com/privacy", "lastUpdated": "2016-11-21T00:00"}
        //],

        // Customization options for the Logon screens, uncomment to use

        /**
         * backgroundImage - Path to the background image used for logon screens
         */
        //"backgroundImage": "../../../background.jpg",

        /**
         * styleSheet - Path to the css file used for logon screens
         */
        //"styleSheet": "../../../custom.css",

        /**
         * hideLogoCopyright - Boolean value to hide the logo and copyright text in the footer of logon screens
         */
        //"hideLogoCopyright": false,

        /**
         * copyrightLogo - Path to the logo image in the footer
         */
        //"copyrightLogo": "img/sapLogo.png",

        /**
         * copyrightMsg - An array of 2 strings to specify 2 lines of copyright text in the footer
         */
        //"copyrightMsg": ["Copyright © 2016 SAP SE.", "All rights reserved."],

        /**
         * disablePasscode - Boolean value to disable the passcode screen
         * Note this value should not be set when multi-user support is enabled.
         */
        //"disablePasscode": false,

        /**
         * allowSavingFormCredentials - boolean value whether the user will be given an option to
         * save their credentials when using form authentication.  Defaults to false.
         */
        //"allowSavingFormCredentials": true,

        /**
         * enableCacheManager - Boolean value to enable/disable the CacheManager plugin.  The
         * default value is true.
         */
        //"enableCacheManager": false,
    };
