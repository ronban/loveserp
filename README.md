SAP Fiori Client
================
The SAP Fiori Client is a native mobile application runtime container for SAP Fiori built using Kapsel plugins. The SAP Fiori Client provides access to native device functionality via plugins such as the ability to scan a barcode, take a picture, access the calendar, print or take a voice recording as well as providing the ability to use enterprise services of the SMP server. 

This document describes how to setup the development environment and use the script to create an instance of the SAP Fiori Client. For additional details see [https://blogs.sap.com/2016/11/10/sap-fiori-client-sp13/](https://blogs.sap.com/2016/11/10/sap-fiori-client-sp13/ "SAP Fiori Client in Getting Started with Kapsel"), [http://help.sap.com/fiori-client](http://help.sap.com/fiori-client "SAP Fiori Client"), or [http://help.sap.com/smp3014sdk#section4](http://help.sap.com/smp3014sdk#section4 "Mobilizing SAP Fiori")


Requirements
------------
The SAP Fiori Client script supports the Windows, Android and iOS operating systems.

In order to create the SAP Fiori Client application, you will need access to a properly configured Cordova development environment.

For the iOS version of the application, the environment should include an installation of the latest compatible version of the Xcode IDE.

For the Android version of the application, the environment should include an installation of the latest compatible version of the Android Developer Tools (ADT).

For the Windows version of the application, the environment should include an installation of the latest compatible version of the Visual Studio 2015. It is necessary because only Visual Studio 2015 supports Universal application development.

With the platform SDKs installed, you will also need a functional Cordova development environment. To install a Cordova development, perform the following steps:

1.  Install node.js (http://nodejs.org/)
2.  Install Apache Cordova (instructions below)

To install Cordova, the command will differ depending on whether the development environment is running Windows or Macintosh OS X. 

On Windows, open a terminal window and issue the following command:

    npm install -g cordova@6.5.0

For Macintosh OS X, open a terminal window and issue the following command:

    sudo npm install -g cordova@6.5.0

Finally, install the SMP SDK using the installation settings appropriate for your environment (since you're reading this document, it's assumed this step has already been completed).

The SAP Fiori Client script will add several Cordova plugins to the project. If you are running in a corporate environment with a proxy, you may need to configure the proxy settings for git, npm, and gradle(if using Android). To do this create the following environment variables.

    http_proxy=http://proxy:8080
    https_proxy=$http_proxy

You will need to substitute the correct proxy server address.

If developing for Android and a proxy is used create the following file. 

    C:\Users\i82xxx\.gradle\gradle.properties
 or
 
    /Users/i82xxx/.gradle/gradle.properties

Its contents might be as follows. 

    systemProp.http.proxyHost=proxy
    systemProp.http.proxyPort=8080
    systemProp.http.nonProxyHosts=*.sap.corp|localhost
    systemProp.https.proxyHost=proxy
    systemProp.https.proxyPort=8080
    systemProp.https.nonProxyHosts=*.sap.corp|localhost

Creating the SAP Fiori Client Application
-----------------------------------------
To create an instance of the SAP Fiori Client application, you must follow the steps outlined in the sections that follow.

###Script Configuration
In order for the script to be able to operate correctly, it needs several pieces of information. Rather than require that all of the possible configuration options be passed to the script on the command line, settings are instead written to a configuration file and a path to the configuration file is passed to the script when it executes. This allows organizations to easily create multiple instances of the SAP Fiori Client application by simply passing different configuration files to the script.   

Open a terminal window then navigate to the SMP installation's KapselSDK\apps\fiori_client folder. In the folder is the default configuration file, config.json. The file contents consist of a simple JSON object as shown below:

    {
        "packageName": "",
        "targetFolder": ""
        "appName": "",
        "platforms": ["ios", "android", "windows"],
        "cordovaPluginIncludes": [],
        "cordovaPluginExcludes": [],
        "crosswalkEnabled": true
    }

To configure the script, simply populate the different properties in the file using the following list as a guide:

+ packageName - Defines the unique package name for the Cordova application created by the script. The package name is how this particular application will be identified on mobile devices and in app stores. The package name is traditionally the application name bundled, in reverse domain order, with the creating company's internet domain name. So, if the developer's company name is companyname.com and an application called FioriClient was being created, the package name would be com.companyname.FioriClient. On Windows there is a limitation which means that only 26 character is allowed for packageName.

+ targetFolder - Specifies the target folder for the SAP Fiori Client application. Only a single folder name can be specified, and the folder cannot already exist within the Fiori Client script folder. The script will create the SAP Fiori Client application project in a sub-folder using the provided folder name.

+ appName - The title for the application being created by the script. The value provided here will appear on a target mobile device home screen as the name of the application. Windows, Android and iOS have limits restricting the length of this value.

+ platforms - a JavaScript array containing values specifying the target platforms for the mobile application. Available options are Android or iOS or Windows and at least one value must be provided.

+ cordovaPluginIncludes - An array of additional Cordova plugins to be added to the application.  The format can be either plugin@version or if the plugin requires variables an object  containing an id and variables property. eg. { "id" : "cordova-plugin-sample", variables: { "variable1" : "variable1Value"}}

+ cordovaPluginExcludes - An array of Cordova plugins that should not be added to the application.

+ crosswalkEnabled - Enables or disables crosswalk. Crosswalk replaces the default WebView that renders your application. For more information, please refer to https://blogs.sap.com/2017/01/28/appendix-c-crosswalk/

The following is an example of a properly configured config.json file:

    {
        "packageName": "com.mycompany.FioriClient",
        "targetFolder": "fc_app",
        "appName": "Fiori",
        "platforms": ["ios", "android", "windows"],
        "cordovaPluginExcludes" : ["kapsel-plugin-push"]
    }

Create one or more configuration files as needed for your environment.

###Executing the Script
With a configuration file in place, execute the following commands:

    npm install
    node create_fiori_client.js path_to_config_file

The first command installs any required npm modules used by the script. The second command executes the create_fiori_client.js JavaScript application and tells the script which configuration file to use to create the application project. The script will use the values provided in the configuration file to create a new Cordova project (in the specified target folder) and add all of the required components (Cordova and Kapsel plugins, copy over the application's web application content).

The script performs a lot of steps, so expect the process to take some time. Because of all the things it does and the fact that some required components like the Cordova plugins are being retrieved from a remote location, the process may encounter problems and quit. Watch the terminal window output for any error messages. If you encounter any, you will need to fix the error and run the node script again.

** Note: The script cannot create a new project in an existing folder, so if you correct errors encountered by the script, you may need to delete the target folder before executing the command again.  

** Note2: On Windows there are some hooks under the template\scripts folder which modify the structure and the manifest file of the application while the create_fiori_client.js is running.

###Browserify
Specifying this option during build will compile plugin JS at build time using browserify instead of runtime.  This can reduce the time taken to load the Cordova plugins.  Execute the command like the following:

    cordova build android --browserify
