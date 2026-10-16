Shader "AnotherWorld/HidrokShield"
{
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" }
        Pass
        {
            Name "Shield"
            Tags { "LightMode"="SRPDefaultUnlit" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            struct Attributes { float4 positionOS:POSITION;float2 uv:TEXCOORD0; };
            struct Varyings { float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0; };
            Varyings vert(Attributes input){Varyings output;output.positionCS=TransformObjectToHClip(input.positionOS.xyz);output.uv=input.uv;return output;}
            half4 frag(Varyings input):SV_Target
            {
                float2 grid=abs(frac(input.uv*float2(48,24))-.5);
                float gridIntensity=smoothstep(.475,.495,max(grid.x,grid.y));
                return half4(.16,.75,.88,.06+gridIntensity*.45);
            }
            ENDHLSL
        }
    }
}
