#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/HUD.h"
#include "AWGameMode.generated.h"

UCLASS()
class ANOTHERWORLD_API AAWHUD : public AHUD
{
    GENERATED_BODY()
public:
    virtual void DrawHUD() override;
};

UCLASS()
class ANOTHERWORLD_API AAWGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    AAWGameMode();
};
