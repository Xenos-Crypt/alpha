using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using AnotherWorld.World;

namespace AnotherWorld.Editor
{
    // Renders a single house to Logs/house-review.png so it can actually be
    // looked at and compared against a reference image, instead of judging
    // geometry/material changes by reading the C# alone.
    public static class HouseReview
    {
        static Camera reviewCamera; static RenderTexture reviewTarget; static int warmup;

        public static void Capture()
        {
            ProjectSetup.Setup(); EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var root = new GameObject("House review").transform;
            WorldShapes.Box(root, "Ground", new Vector3(40, .15f, 40), new Vector3(0, -.075f, 0), WorldShapes.Material("Review ground", new Color(.2f, .24f, .22f), "paving"));
            NeighbourhoodArchitecture.House(root, Vector3.zero);

            var sun = new GameObject("Sun").AddComponent<Light>(); sun.type = LightType.Directional; sun.intensity = 1.1f; sun.shadows = LightShadows.Soft; sun.transform.rotation = Quaternion.Euler(35, -130, 0);
            var ambient = new SphericalHarmonicsL2(); ambient.AddAmbientLight(new Color(.15f, .18f, .24f)); RenderSettings.ambientProbe = ambient;
            RenderSettings.fog = false;

            var camera = new GameObject("Review camera").AddComponent<Camera>();
            camera.transform.position = new Vector3(9, 4.5f, -19); camera.transform.LookAt(new Vector3(1, 1.6f, -3));
            camera.fieldOfView = 42; camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color(.05f, .07f, .12f);
            camera.GetUniversalAdditionalCameraData().antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;

            var target = new RenderTexture(1280, 960, 24); target.Create();
            reviewCamera = camera; reviewTarget = target; warmup = 0; EditorApplication.update += Complete;
        }

        static void Complete()
        {
            EditorApplication.QueuePlayerLoopUpdate(); if (++warmup < 40) return; EditorApplication.update -= Complete;
            var camera = reviewCamera; var target = reviewTarget;
            RenderPipeline.SubmitRenderRequest(camera, new UniversalRenderPipeline.SingleCameraRequest { destination = target });
            RenderPipeline.SubmitRenderRequest(camera, new UniversalRenderPipeline.SingleCameraRequest { destination = target });
            var previous = RenderTexture.active; RenderTexture.active = target;
            var image = new Texture2D(target.width, target.height, TextureFormat.RGB24, false);
            image.ReadPixels(new Rect(0, 0, target.width, target.height), 0, 0); image.Apply();
            RenderTexture.active = previous;
            Directory.CreateDirectory("Logs");
            File.WriteAllBytes("Logs/house-review.png", image.EncodeToPNG());
            Object.DestroyImmediate(image); target.Release(); Object.DestroyImmediate(target);
            Debug.Log("House review rendered: Logs/house-review.png");
            EditorApplication.Exit(0);
        }
    }
}
