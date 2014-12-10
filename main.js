
define(function (require, exports, module) {
    "use strict";
    
    var FileSystem  = brackets.getModule("filesystem/FileSystem"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        ExtensionLoader = brackets.getModule("utils/ExtensionLoader"),
        _oldOpenProject = ProjectManager.openProject;
    
    ProjectManager.openProject = function(path) {
        var d = new $.Deferred();
        var extensionDir = path + ".brackets-extensions";

        FileSystem.getDirectoryForPath(extensionDir).getContents(function (err) {
            if (!err) {
                ExtensionLoader.loadAllExtensionsInNativeDirectory(extensionDir).then(function() {
                    d.resolve();
                });
            } else {
               d.resolve();
            }
        });

        return d.then(function() {
            return _oldOpenProject.call(ProjectManager, path);
        });
    };
});
