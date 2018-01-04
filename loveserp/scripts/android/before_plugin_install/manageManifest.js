module.exports = function(context) {
    var fs = context.requireCordovaModule('fs'),
    path = context.requireCordovaModule('path'),
    xml = context.requireCordovaModule('cordova-common').xmlHelpers;

    var manifestPath = path.join(context.opts.projectRoot, 'platforms', 'android', 'AndroidManifest.xml');
    var doc = xml.parseElementtreeSync(manifestPath);
    if (doc.getroot().tag !== 'manifest') {
        throw new Error(manifestPath + ' has incorrect root node name (expected "manifest")');
    }

    doc.getroot().find('./application').attrib['android:allowBackup'] = "false";

    //add the tools namespace to the manifest node and tools:replace to the application node.
    //Since barcodescanner plugin library contains android:allowBackup="true", it's conflictd with fiori client(android:allowBackup="false").
    //To keep using fiori client default value, add them below.
    doc.getroot().attrib['xmlns:tools'] = 'http://schemas.android.com/tools';
    doc.getroot().find('./application').attrib['tools:replace'] = 'android:allowBackup';


    //write the manifest file
    fs.writeFileSync(manifestPath, doc.write({
        indent: 4
    }), 'utf-8');
};