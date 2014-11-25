import random
import time
from hashlib import sha1
random.seed(12345)
print "Experiment Parameter 1: The keysize in bits is", sha1().digest_size * 8


def getHash(value):
    return long(sha1(value).hexdigest(),16)

def hashBetween(target, left, right):
    if left ==  right:
        return True
    if target == left or target == right:
        return False
    #print target, "<", right, "and", target, ">", left, target < right and target > left
    if target < right and target > left:
        return True
    #print left, ">", right, left > right 
    if left > right :
        #print left, ">", target, "and", target, "<", right, left > target and target < right
        if left > target and target < right:
            return True
        #print left, "<", target, "and", target, ">", right, left < target and target > right
        if left < target and target > right:
            return True
    return False


def generateRandomIP():
    return "".join(map(str, (random.randint(0,255) for _ in range(4))))

def generateRandomPort():
    return str(random.randint(0,65535))




def testWide(trials):
    mal = generateRandomIP()
    success = 0.0
    times = []
    for _ in xrange(trials):
        start = time.time() 
        n = getHash(generateRandomIP())
        m = getHash(generateRandomIP())
        for j in xrange(49152,65535):
            port = str(j)
            attempt = getHash(mal+port)
            if hashBetween(attempt,n,m):
                success += 1
                break
        times.append(time.time() - start)
    print "Successes:", success/trials,"Avg time:", sum(times)/trials 






def testSuccessors(trials):
    mal = generateRandomIP()
    victims =  [getHash(generateRandomIP()+generateRandomPort()) for _ in xrange(trials)]
    victims = sorted(victims)
    success = 0.0
    times = []
    attempts = []
    #We get the last pair for free since we had to join the network in between a pair
    for i in xrange(trials -1):
        tries = 0.0 
        start = time.time() 
        n = victims[i]
        m = victims[i+1]

        for j in xrange(49152,65535):
            tries +=1
            port = str(j)
            attempt = getHash(mal+port)
            if hashBetween(attempt,n,m):
                success += 1
                break
        times.append(time.time() - start)
        attempts.append(tries)
    print "Network Size:", trials, "Successes:", success/trials,"Avg time:", sum(times)/trials, "Avg Ports tried:", sum(attempts)/trials

def testCollisions(networkSize):
    mal = generateRandomIP()
    victims =  [getHash(generateRandomIP()+generateRandomPort()) for _ in xrange(networkSize)]
    victims = sorted(victims)
    success = 0.0
    injections = 0.0
    mal = generateRandomIP()
    malKeys = [getHash(mal+str(p)) for p in xrange(49152,65535)]
    malKeys = sorted(malKeys)

    """
    Let's make this an O(n) operation
    """
    malIndex = 0
    for i in xrange(networkSize - 1):
        a = victims[i]
        b = victims[i+1]
        injected = False
        while   malIndex < len(malKeys) and malKeys[malIndex] < b:
            attempt = malKeys[malIndex]
            if hashBetween(attempt,a,b):
                injected  = True
                injections += 1
            malIndex +=1
        if injected:
            success += 1
    malIndex = 0
    a = victims[-1]
    b = victims[0]
    injected = False
    while  malIndex < len(malKeys) and malKeys[malIndex] < b:
        attempt = malKeys[malIndex]
        if hashBetween(attempt,a,b):
            injected  = True
            injections += 1
        malIndex +=1
    if injected:
        success += 1
    print "Network Size:", networkSize, "Regions Injected :", success/networkSize, "avg Injections per region", injections/networkSize

        
  




#testWide(100000)
#testSuccessors(100)
#testSuccessors(200)
testCollisions(100000)
#print "Network Size:", trials, "Successes:", success/trialstestSuccessors(1000)
"""Linear scale of injections per region"""
#testSuccessors(20000)
