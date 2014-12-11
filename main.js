
define(function (require, exports, module) {
    "use strict";
    
    var FileSystem  = brackets.getModule("filesystem/FileSystem"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        ExtensionLoader = brackets.getModule("utils/ExtensionLoader"),
        FileUtils = brackets.getModule("file/FileUtils"),
        Package = brackets.getModule("extensibility/Package"),
        ExtensionManager = brackets.getModule("extensibility/ExtensionManager"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs = brackets.getModule("widgets/DefaultDialogs"),
        _oldOpenProject = ProjectManager.openProject;
    
    ProjectManager.openProject = function(path) {
        var d = new $.Deferred();
        var extensionDir = path + ".brackets-extensions";

        FileSystem.getDirectoryForPath(extensionDir).getContents(function (err) {
            if (!err) {
                var autoInstallFile = FileSystem.getFileForPath(extensionDir + "/autoinstall.json");
                FileUtils.readAsText(autoInstallFile).done(function(installJson) {
                    var extensions = ExtensionManager.extensions;
                    var install = JSON.parse(installJson).filter(function(name) {
                        return !extensions[name] || !extensions[name].installInfo;
                    });

                    if (install.length) {
                        Package._getNodeConnectionDeferred().then(function() {
                            var promises = [];
                            ExtensionManager.downloadRegistry().done(function(registry) {
                                install.forEach(function(name) {
                                    var extension = extensions[name];
                                    if (!extension) {
                                        Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,
                                            "Plugins AutoInstall Error", "Could not get package info for autoinstall extension: " + name);
                                    }
                                    else {
                                        var latest = ExtensionManager.getCompatibilityInfo(extension.registryInfo, brackets.metadata.apiVersion);
                                        var url = ExtensionManager.getExtensionURL(name, latest.compatibleVersion);
                                        promises.push(Package.installFromURL(url).promise);
                                    }
                                    if (promises.length) {
                                        $.when.apply($, promises).done(function() {
                                            Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO,
                                                "Plugins AutoInstalled", "New plugins have been automatically installed. You should restart");
                                        }).fail(function() {
                                            Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,
                                                "Plugins AutoInstall Error", "Unable to install packages from autoinstall.json");
                                        });
                                    }
                                });
                            });
                        });
                    }
                });

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
