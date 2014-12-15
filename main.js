
define(function (require, exports, module) {
    "use strict";
    
    var FileSystem         = brackets.getModule("filesystem/FileSystem"),
        ProjectManager     = brackets.getModule("project/ProjectManager"),
        ExtensionLoader    = brackets.getModule("utils/ExtensionLoader"),
        FileUtils          = brackets.getModule("file/FileUtils"),
        Package            = brackets.getModule("extensibility/Package"),
        ExtensionManager   = brackets.getModule("extensibility/ExtensionManager"),
        Dialogs            = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs     = brackets.getModule("widgets/DefaultDialogs"),
        PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        _                  = brackets.getModule("thirdparty/lodash");

    var prefs           = PreferencesManager.getExtensionPrefs("project-extensions"),
        installing      = [],
        _oldOpenProject = ProjectManager.openProject;

    prefs.definePreference("install", "array", []);

    prefs.on("change", function() {
        var extensions = ExtensionManager.extensions;

        var install = prefs.get("install").filter(function(name) {
            return (!extensions[name] || !extensions[name].installInfo) && !_.contains(installing, name);
        });
        if (install.length) {
            installing = installing.concat(install);
            Package._getNodeConnectionDeferred().then(function() {
                var promises = [];
                ExtensionManager.downloadRegistry().done(function(registry) {
                    install.forEach(function(name) {
                        var extension = extensions[name];
                        if (!extension) {
                            Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,
                                "Project Extensions", "Could not get package info to install extension: " + name);
                        }
                        else {
                            var latest = ExtensionManager.getCompatibilityInfo(extension.registryInfo, brackets.metadata.apiVersion);
                            var url = ExtensionManager.getExtensionURL(name, latest.compatibleVersion);
                            promises.push(Package.installFromURL(url).promise);
                        }
                    });
                    if (promises.length) {
                        $.when.apply($, promises).done(function() {
                            Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO,
                                "Project Extensions", "New plugins have been installed. You may need to restart.");
                        }).fail(function(err) {
                            Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,
                                "Project Extensions", "Unable to install extensions: " + err);
                        });
                    }
                });
            });
        }
    });
    
    ProjectManager.openProject = function(path) {
        var d = new $.Deferred();
        var extensionDir = path + ".brackets-extensions";

        FileSystem.getDirectoryForPath(extensionDir).getContents(function (err) {
            if (!err) {
                ExtensionLoader.loadAllExtensionsInNativeDirectory(extensionDir).then(function() {
                    d.resolve();
                });
            }
            else {
               d.resolve();
            }
        });

        return d.then(function() {
            return _oldOpenProject.call(ProjectManager, path);
        });
    };
});
