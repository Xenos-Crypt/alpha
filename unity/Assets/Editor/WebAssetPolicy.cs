using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace AnotherWorld.Editor
{
    public sealed class WebAssetPolicy : AssetPostprocessor, IPreprocessBuildWithReport
    {
        public int callbackOrder=>0;
        void OnPreprocessTexture()
        {
            var importer=(TextureImporter)assetImporter;
            if(assetPath.Contains("-normal"))importer.textureType=TextureImporterType.NormalMap;
            importer.maxTextureSize=1024;importer.mipmapEnabled=true;importer.streamingMipmaps=true;importer.filterMode=FilterMode.Trilinear;importer.anisoLevel=8;
            importer.textureCompression=TextureImporterCompression.Compressed;
            var settings=importer.GetPlatformTextureSettings("WebGL");settings.overridden=true;settings.maxTextureSize=1024;
            settings.format=TextureImporterFormat.Automatic;importer.SetPlatformTextureSettings(settings);
        }
        void OnPreprocessAudio()
        {
            var importer=(AudioImporter)assetImporter;
            var settings=importer.defaultSampleSettings;settings.compressionFormat=AudioCompressionFormat.Vorbis;
            settings.loadType=AudioClipLoadType.DecompressOnLoad;settings.quality=.6f;settings.preloadAudioData=true;
            settings.sampleRateSetting=AudioSampleRateSetting.OptimizeSampleRate;
            importer.defaultSampleSettings=settings;importer.SetOverrideSampleSettings("WebGL",settings);
            importer.loadInBackground=true;
        }
        public void OnPreprocessBuild(BuildReport report)
        {
            if(report.summary.platform!=BuildTarget.WebGL)return;
            foreach(string guid in AssetDatabase.FindAssets("t:Texture2D",new[]{"Assets"}))
            {
                string path=AssetDatabase.GUIDToAssetPath(guid);var importer=AssetImporter.GetAtPath(path) as TextureImporter;
                if(importer==null)continue;var settings=importer.GetPlatformTextureSettings("WebGL");
                int size=settings.overridden?settings.maxTextureSize:importer.maxTextureSize;
                if(size>1024)throw new BuildFailedException("Web texture exceeds 1024 px: "+path);
            }
            foreach(string guid in AssetDatabase.FindAssets("t:AudioClip",new[]{"Assets"}))
            {
                string path=AssetDatabase.GUIDToAssetPath(guid);var importer=AssetImporter.GetAtPath(path) as AudioImporter;
                if(importer==null)continue;var s=importer.ContainsSampleSettingsOverride("WebGL")?importer.GetOverrideSampleSettings("WebGL"):importer.defaultSampleSettings;
                if(s.loadType!=AudioClipLoadType.DecompressOnLoad||s.compressionFormat!=AudioCompressionFormat.Vorbis)
                    throw new BuildFailedException("Web audio must use Vorbis and Decompress on Load: "+path);
            }
        }
    }
}
